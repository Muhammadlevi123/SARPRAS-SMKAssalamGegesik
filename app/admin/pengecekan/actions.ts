"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { fmtBulan, kodeBulan, parseBulan, parseTanggal, rentangBulan } from "@/lib/format";
import type { FormState } from "@/lib/formState";

export type HasilSimpanCek = FormState & { kembali?: string };

const teks = (v: FormDataEntryValue | null) => String(v ?? "").trim();

// Angka bulat 0 atau lebih. null kalau tidak valid
function angka(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 1_000_000 ? n : null;
}

// Segarkan halaman pengecekan admin & user setelah data berubah
function segarkan(lokasiId: number) {
  revalidatePath("/admin/pengecekan");
  revalidatePath(`/admin/pengecekan/lokasi/${lokasiId}`);
  revalidatePath("/admin");
  revalidatePath("/user/pengecekan");
  revalidatePath("/user");
}

// ===== Periode (bulan) pengecekan: KHUSUS ADMIN =====

export async function tambahPeriode(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  // Kode bulan dari pilihan, misal "2026-10"
  const awal = parseBulan(teks(formData.get("bulan")));
  if (!awal) return { error: "Bulan tidak valid" };
  const rentang = rentangBulan(awal);

  // Bulan harus berada di dalam salah satu tahun ajaran
  const ta = await prisma.tahunAjaran.findFirst({
    where: { mulai: { lt: rentang.lt }, selesai: { gte: rentang.gte } },
    select: { id: true },
  });
  if (!ta) return { error: `${fmtBulan(awal)} di luar tahun ajaran mana pun. Tambahkan tahun ajarannya dulu.` };

  const sudah = await prisma.periodePengecekan.findUnique({ where: { bulan: awal }, select: { id: true } });
  if (sudah) return { error: `Pengecekan ${fmtBulan(awal)} sudah ada di daftar` };

  await prisma.periodePengecekan.create({ data: { bulan: awal } });

  revalidatePath("/admin/pengecekan");
  revalidatePath("/user/pengecekan");
  revalidatePath("/user");
  return { ok: true, pesan: `Pengecekan ${fmtBulan(awal)} ditambahkan. Klik Detail untuk mulai mengecek.` };
}

export async function hapusPeriode(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

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
  revalidatePath("/user/pengecekan");
  revalidatePath("/user");
  return { ok: true, pesan: `Pengecekan ${fmtBulan(periode.bulan)} dihapus dari daftar` };
}

// ===== Pengecekan per lokasi =====
// ADMIN : semua lokasi, semua bulan
// USER  : hanya lokasinya sendiri, hanya di bulan yang sudah dibuka admin

export async function simpanPengecekan(_prev: FormState, formData: FormData): Promise<HasilSimpanCek> {
  const user = await requireUser();
  const admin = user.role === "ADMIN";

  const id = Number(formData.get("id")) || 0; // 0 = pengecekan baru
  const lokasiId = Number(formData.get("lokasiId"));
  const tanggal = parseTanggal(teks(formData.get("tanggal")));
  const petugas = teks(formData.get("petugas"));
  const catatan = teks(formData.get("catatan")) || null;

  if (!Number.isInteger(lokasiId) || lokasiId <= 0) return { error: "Lokasi tidak valid" };

  // USER tidak boleh menyimpan pengecekan lokasi lain (walaupun lokasiId di form diubah)
  if (!admin && lokasiId !== user.lokasiId) {
    return { error: "Anda hanya bisa mengecek lokasi Anda sendiri" };
  }

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

  const awalBulan = rentangBulan(tanggal).gte;

  // USER hanya bisa membuat pengecekan baru di bulan yang sudah dibuka admin
  if (!admin && !id) {
    const dibuka = await prisma.periodePengecekan.findUnique({ where: { bulan: awalBulan }, select: { id: true } });
    if (!dibuka) return { error: `Admin belum membuka pengecekan bulan ${fmtBulan(tanggal)}` };
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

  await prisma.$transaction(async (tx) => {
    if (id) {
      await tx.pengecekan.update({ where: { id }, data: { tanggal, petugas, catatan } });
      await tx.pengecekanItem.deleteMany({ where: { pengecekanId: id } });
      await tx.pengecekanItem.createMany({ data: items.map((it) => ({ ...it, pengecekanId: id })) });
    } else {
      await tx.pengecekan.create({ data: { lokasiId, tanggal, petugas, catatan, items: { create: items } } });
    }
    // ADMIN: pastikan bulannya tercatat di daftar (kalau belum ada).
    // USER tidak perlu: bulannya pasti sudah dibuka admin (dicek di atas).
    if (admin) {
      await tx.periodePengecekan.upsert({ where: { bulan: awalBulan }, create: { bulan: awalBulan }, update: {} });
    }
  });

  segarkan(lokasiId);

  // Halaman tujuan setelah menyimpan
  let kembali = `/admin/pengecekan/bulan/${kodeBulan(tanggal)}`;
  if (!admin) {
    const ta = await prisma.tahunAjaran.findFirst({
      where: { mulai: { lte: tanggal }, selesai: { gte: awalBulan } },
      select: { id: true },
    });
    kembali = ta ? `/user/pengecekan?ta=${ta.id}` : "/user/pengecekan";
  }

  return {
    ok: true,
    pesan: id ? `Pengecekan ${lokasi.nama} diperbarui` : `Pengecekan ${lokasi.nama} tersimpan`,
    kembali,
  };
}

// Hapus pengecekan: KHUSUS ADMIN
export async function hapusPengecekan(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!id) return { error: "Data tidak valid" };

  const cek = await prisma.pengecekan.findUnique({ where: { id }, select: { tanggal: true, lokasiId: true } });
  if (!cek) return { error: "Pengecekan tidak ditemukan" };

  await prisma.pengecekan.delete({ where: { id } }); // isinya ikut terhapus (Cascade)

  segarkan(cek.lokasiId);
  redirect(`/admin/pengecekan/bulan/${kodeBulan(cek.tanggal)}`);
}