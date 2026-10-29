"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { fmtBulan, kodeBulan, parseBulan, parseTanggal, rentangBulan } from "@/lib/format";
import type { FormState } from "@/lib/formState";

export type HasilSimpanCek = FormState & { kembali?: string };

const teks = (v: FormDataEntryValue | null) => String(v ?? "").trim();

// Angka bulat 0 atau lebih. null kalau tidak valid
function angka(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 1_000_000 ? n : null;
}

// ===== Periode (bulan) pengecekan =====

export async function tambahPeriode(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();

  const tahun = Number(formData.get("tahun"));
  const bulan = Number(formData.get("bulan"));
  if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) return { error: "Tahun tidak valid" };
  if (!Number.isInteger(bulan) || bulan < 1 || bulan > 12) return { error: "Bulan tidak valid" };

  const awal = parseBulan(`${tahun}-${String(bulan).padStart(2, "0")}`);
  if (!awal) return { error: "Bulan tidak valid" };

  const sudah = await prisma.periodePengecekan.findUnique({ where: { bulan: awal }, select: { id: true } });
  if (sudah) return { error: `Pengecekan ${fmtBulan(awal)} sudah ada di daftar` };

  await prisma.periodePengecekan.create({ data: { bulan: awal } });

  revalidatePath("/admin/pengecekan");
  return { ok: true, pesan: `Pengecekan ${fmtBulan(awal)} ditambahkan. Klik Detail untuk mulai mengecek.` };
}

export async function hapusPeriode(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();

  const id = Number(formData.get("id"));
  if (!id) return { error: "Data tidak valid" };

  const periode = await prisma.periodePengecekan.findUnique({ where: { id } });
  if (!periode) return { error: "Periode tidak ditemukan" };

  const isi = await prisma.pengecekan.count({ where: { tanggal: rentangBulan(periode.bulan) } });
  if (isi > 0) {
    return { error: `${fmtBulan(periode.bulan)} sudah berisi ${isi} pengecekan lokasi, hapus pengecekannya dulu.` };
  }

  await prisma.periodePengecekan.delete({ where: { id } });

  revalidatePath("/admin/pengecekan");
  return { ok: true, pesan: `Pengecekan ${fmtBulan(periode.bulan)} dihapus dari daftar` };
}

// ===== Pengecekan per lokasi =====

export async function simpanPengecekan(_prev: FormState, formData: FormData): Promise<HasilSimpanCek> {
  await requireUser();

  const id = Number(formData.get("id")) || 0; // 0 = pengecekan baru
  const lokasiId = Number(formData.get("lokasiId"));
  const tanggal = parseTanggal(teks(formData.get("tanggal")));
  const petugas = teks(formData.get("petugas"));
  const catatan = teks(formData.get("catatan")) || null;

  if (!Number.isInteger(lokasiId) || lokasiId <= 0) return { error: "Lokasi tidak valid" };
  if (!tanggal) return { error: "Tanggal tidak valid" };
  if (!petugas) return { error: "Nama petugas wajib diisi" };
  if (petugas.length > 191 || (catatan?.length ?? 0) > 191) {
    return { error: "Isian terlalu panjang (maks. 191 karakter)" };
  }

  const lokasi = await prisma.lokasi.findUnique({
    where: { id: lokasiId },
    select: { nama: true, barang: { select: { id: true, nama: true } } },
  });
  if (!lokasi) return { error: "Lokasi tidak ditemukan" };

  if (id) {
    const lama = await prisma.pengecekan.findUnique({ where: { id }, select: { lokasiId: true } });
    if (!lama || lama.lokasiId !== lokasiId) return { error: "Data pengecekan tidak valid" };
  }

  // Aturan: 1 lokasi 1x per bulan
  const bentrok = await prisma.pengecekan.findFirst({
    where: { lokasiId, tanggal: rentangBulan(tanggal), NOT: id ? { id } : undefined },
    select: { id: true },
  });
  if (bentrok) return { error: `${lokasi.nama} sudah dicek di bulan ${fmtBulan(tanggal)}` };

  // Isi pengecekan: [{ barangId, baik, kurang, rusak, ket }]
  let mentah: unknown;
  try {
    mentah = JSON.parse(teks(formData.get("items")));
  } catch {
    return { error: "Data pengecekan tidak valid" };
  }
  if (!Array.isArray(mentah)) return { error: "Data pengecekan tidak valid" };

  const namaBarang = new Map(lokasi.barang.map((b) => [b.id, b.nama]));
  const sudah = new Set<number>();
  const items: {
    barangId: number;
    jumlahAda: number;
    rusakRingan: number;
    rusakBerat: number;
    keterangan: string | null;
  }[] = [];

  for (const r of mentah) {
    const o = (r ?? {}) as Record<string, unknown>;
    const barangId = Number(o.barangId);
    const nama = namaBarang.get(barangId);
    if (!nama || sudah.has(barangId)) continue; // abaikan barang yang bukan milik lokasi ini / dobel
    sudah.add(barangId);

    const baik = angka(o.baik);
    const kurang = angka(o.kurang);
    const rusak = angka(o.rusak);
    if (baik === null || kurang === null || rusak === null) {
      return { error: `"${nama}": isian harus angka 0 atau lebih` };
    }

    const keterangan = typeof o.ket === "string" ? o.ket.trim() || null : null;
    if ((keterangan?.length ?? 0) > 191) return { error: `"${nama}": keterangan terlalu panjang` };

    items.push({
      barangId,
      jumlahAda: baik + kurang + rusak, // semua yang fisiknya ditemukan
      rusakRingan: kurang, // "Kurang Baik"
      rusakBerat: rusak,
      keterangan,
    });
  }

  if (items.length === 0) return { error: "Tidak ada barang yang dicek" };

  const awalBulan = rentangBulan(tanggal).gte;

  await prisma.$transaction(async (tx) => {
    if (id) {
      await tx.pengecekan.update({ where: { id }, data: { tanggal, petugas, catatan } });
      await tx.pengecekanItem.deleteMany({ where: { pengecekanId: id } });
      await tx.pengecekanItem.createMany({ data: items.map((it) => ({ ...it, pengecekanId: id })) });
    } else {
      await tx.pengecekan.create({ data: { lokasiId, tanggal, petugas, catatan, items: { create: items } } });
    }
    // Pastikan bulannya tercatat di daftar (kalau belum ada)
    await tx.periodePengecekan.upsert({ where: { bulan: awalBulan }, create: { bulan: awalBulan }, update: {} });
  });

  revalidatePath("/admin/pengecekan");
  revalidatePath(`/admin/pengecekan/lokasi/${lokasiId}`);
  revalidatePath("/admin");
  return {
    ok: true,
    pesan: id ? `Pengecekan ${lokasi.nama} diperbarui` : `Pengecekan ${lokasi.nama} tersimpan`,
    kembali: `/admin/pengecekan/bulan/${kodeBulan(tanggal)}`,
  };
}

export async function hapusPengecekan(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();

  const id = Number(formData.get("id"));
  if (!id) return { error: "Data tidak valid" };

  const cek = await prisma.pengecekan.findUnique({ where: { id }, select: { tanggal: true, lokasiId: true } });
  if (!cek) return { error: "Pengecekan tidak ditemukan" };

  await prisma.pengecekan.delete({ where: { id } }); // isinya ikut terhapus (Cascade)

  revalidatePath("/admin/pengecekan");
  revalidatePath(`/admin/pengecekan/lokasi/${cek.lokasiId}`);
  revalidatePath("/admin");
  redirect(`/admin/pengecekan/bulan/${kodeBulan(cek.tanggal)}`);
}