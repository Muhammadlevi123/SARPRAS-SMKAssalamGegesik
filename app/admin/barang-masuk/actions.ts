"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { hapusFotoNota, simpanFotoNota } from "@/lib/fotoNota";
import { isSumber, parseTanggal, type BiayaLain } from "@/lib/format";
import type { FormState } from "@/lib/formState";

export type HasilSimpanNota = FormState & { id?: number };

type ItemMasuk = {
  mode: "ada" | "baru";
  barangId: number;
  nama: string;
  merk: string | null;
  kategori: string | null;
  satuan: string;
  lokasiId: number;
  jumlah: number;
  harga: number | null;
};

const teks = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const MAKS = 191;

function bacaJson(json: string): { data?: unknown; error?: string } {
  try {
    return { data: JSON.parse(json) };
  } catch {
    return { error: "Data tidak valid" };
  }
}

// Daftar barang di nota
function bacaItems(json: string, pembelian: boolean): { items?: ItemMasuk[]; error?: string } {
  const { data: mentah, error } = bacaJson(json);
  if (error) return { error: "Data barang tidak valid" };
  if (!Array.isArray(mentah) || mentah.length === 0) return { error: "Tambahkan minimal 1 barang" };
  if (mentah.length > 100) return { error: "Maksimal 100 barang dalam satu nota" };

  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const n = (v: unknown) => (typeof v === "number" ? v : Number(v));

  const items: ItemMasuk[] = [];
  for (const [i, r] of mentah.entries()) {
    const no = i + 1;
    const o = (r ?? {}) as Record<string, unknown>;
    const mode = o.mode === "baru" ? "baru" : "ada";

    const jumlah = n(o.jumlah);
    if (!Number.isInteger(jumlah) || jumlah < 1) return { error: `Barang #${no}: jumlah minimal 1` };

    let harga: number | null = null;
    if (pembelian) {
      harga = n(o.harga);
      if (o.harga === null || o.harga === "" || !Number.isInteger(harga) || harga < 0) {
        return { error: `Barang #${no}: harga satuan wajib diisi` };
      }
      if (harga > 2_000_000_000) return { error: `Barang #${no}: harga satuan terlalu besar` };
    }

    if (mode === "ada") {
      const barangId = n(o.barangId);
      if (!Number.isInteger(barangId) || barangId <= 0) return { error: `Barang #${no}: pilih barang` };
      items.push({ mode, barangId, nama: "", merk: null, kategori: null, satuan: "", lokasiId: 0, jumlah, harga });
    } else {
      const nama = s(o.nama);
      const satuan = s(o.satuan);
      const lokasiId = n(o.lokasiId);
      if (!nama) return { error: `Barang #${no}: nama barang baru wajib diisi` };
      if (!satuan) return { error: `Barang #${no}: satuan wajib diisi` };
      if (!Number.isInteger(lokasiId) || lokasiId <= 0) return { error: `Barang #${no}: pilih lokasi` };

      const merk = s(o.merk) || null;
      const kategori = s(o.kategori) || null;
      if ([nama, merk, kategori, satuan].some((v) => (v?.length ?? 0) > MAKS)) {
        return { error: `Barang #${no}: isian terlalu panjang (maks. ${MAKS} karakter)` };
      }
      items.push({ mode, barangId: 0, nama, merk, kategori, satuan, lokasiId, jumlah, harga });
    }
  }

  return { items };
}

// Biaya lain-lain (khusus pembelian)
function bacaBiaya(json: string): { biaya?: BiayaLain[]; error?: string } {
  if (!json) return { biaya: [] };
  const { data: mentah, error } = bacaJson(json);
  if (error || !Array.isArray(mentah)) return { error: "Data biaya lain-lain tidak valid" };
  if (mentah.length > 20) return { error: "Maksimal 20 biaya lain-lain" };

  const biaya: BiayaLain[] = [];
  for (const [i, r] of mentah.entries()) {
    const o = (r ?? {}) as Record<string, unknown>;
    const nama = typeof o.nama === "string" ? o.nama.trim() : "";
    const jumlah = typeof o.jumlah === "number" ? o.jumlah : Number(o.jumlah);

    if (!nama) return { error: `Biaya #${i + 1}: nama biaya wajib diisi` };
    if (nama.length > 100) return { error: `Biaya #${i + 1}: nama terlalu panjang` };
    if (!Number.isInteger(jumlah) || jumlah === 0) return { error: `Biaya "${nama}": nominal tidak valid` };
    if (Math.abs(jumlah) > 2_000_000_000) return { error: `Biaya "${nama}": nominal terlalu besar` };

    biaya.push({ nama, jumlah });
  }
  return { biaya };
}

export async function tambahBarangMasuk(_prev: FormState, formData: FormData): Promise<HasilSimpanNota> {
  await requireUser();

  const tanggal = parseTanggal(teks(formData.get("tanggal")));
  const sumber = teks(formData.get("sumber"));
  const noNota = teks(formData.get("noNota")) || null;
  const keterangan = teks(formData.get("keterangan")) || null;

  if (!tanggal) return { error: "Tanggal tidak valid" };
  if (!isSumber(sumber)) return { error: "Pilih sumber barang" };
  if ((noNota?.length ?? 0) > MAKS || (keterangan?.length ?? 0) > MAKS) {
    return { error: `Isian terlalu panjang (maks. ${MAKS} karakter)` };
  }

  const pembelian = sumber === "PEMBELIAN";

  let mitraId: number | null = null;
  if (sumber === "MOU" || sumber === "BANTUAN") {
    mitraId = Number(formData.get("mitraId")) || null;
    if (sumber === "MOU" && !mitraId) return { error: "Pilih mitra untuk sumber MOU" };
  }

  const { items, error } = bacaItems(teks(formData.get("items")), pembelian);
  if (!items) return { error };

  let biaya: BiayaLain[] = [];
  if (pembelian) {
    const hasil = bacaBiaya(teks(formData.get("biayaLain")));
    if (!hasil.biaya) return { error: hasil.error };
    biaya = hasil.biaya;

    const subtotal = items.reduce((t, it) => t + (it.harga ?? 0) * it.jumlah, 0);
    const totalBiaya = biaya.reduce((t, b) => t + b.jumlah, 0);
    if (subtotal + totalBiaya < 0) return { error: "Total pembayaran tidak boleh minus, periksa potongan" };
  }

  const idBarang = [...new Set(items.filter((i) => i.mode === "ada").map((i) => i.barangId))];
  const idLokasi = [...new Set(items.filter((i) => i.mode === "baru").map((i) => i.lokasiId))];
  const [jmlBarang, jmlLokasi, jmlMitra] = await Promise.all([
    idBarang.length ? prisma.barang.count({ where: { id: { in: idBarang } } }) : Promise.resolve(0),
    idLokasi.length ? prisma.lokasi.count({ where: { id: { in: idLokasi } } }) : Promise.resolve(0),
    mitraId ? prisma.mitra.count({ where: { id: mitraId } }) : Promise.resolve(1),
  ]);
  if (jmlBarang !== idBarang.length) return { error: "Ada barang yang tidak ditemukan, muat ulang halaman" };
  if (jmlLokasi !== idLokasi.length) return { error: "Ada lokasi yang tidak ditemukan, muat ulang halaman" };
  if (!jmlMitra) return { error: "Mitra tidak ditemukan" };

  let foto: string | null = null;
  const file = formData.get("foto");
  if (pembelian && file instanceof File && file.size > 0) {
    const hasil = await simpanFotoNota(file);
    if ("error" in hasil) return { error: hasil.error };
    foto = hasil.nama;
  }

  try {
    const nota = await prisma.$transaction(async (tx) => {
      // Barang baru dibuat otomatis. Kalau nama + merk + lokasi yang sama sudah ada, pakai yang lama.
      const cache = new Map<string, number>();
      const dataItems: { barangId: number; jumlah: number; harga: number | null }[] = [];

      for (const it of items) {
        let barangId = it.barangId;

        if (it.mode === "baru") {
          const kunci = `${it.lokasiId}|${it.nama.toLowerCase()}|${(it.merk ?? "").toLowerCase()}`;
          const tersimpan = cache.get(kunci);
          if (tersimpan) {
            barangId = tersimpan;
          } else {
            const lama = await tx.barang.findFirst({
              where: { nama: it.nama, merk: it.merk, lokasiId: it.lokasiId },
              select: { id: true },
            });
            barangId =
              lama?.id ??
              (
                await tx.barang.create({
                  data: { nama: it.nama, merk: it.merk, kategori: it.kategori, satuan: it.satuan, lokasiId: it.lokasiId },
                  select: { id: true },
                })
              ).id;
            cache.set(kunci, barangId);
          }
        }

        dataItems.push({ barangId, jumlah: it.jumlah, harga: it.harga });
      }

      return tx.barangMasuk.create({
        data: {
          tanggal,
          sumber,
          noNota,
          mitraId,
          foto,
          keterangan,
          biayaLain: biaya.length ? biaya : undefined,
          items: { create: dataItems },
        },
        select: { id: true },
      });
    });

    revalidatePath("/admin/barang-masuk");
    revalidatePath("/admin/barang");
    revalidatePath("/admin/lokasi");
    revalidatePath("/admin");
    return { ok: true, id: nota.id, pesan: `Barang masuk berhasil dicatat (${items.length} barang)` };
  } catch (e) {
    if (foto) await hapusFotoNota(foto);
    throw e;
  }
}

// Hapus nota, lalu hapus juga barang dari nota ini yang sudah tidak punya riwayat lain
// (tidak ada di nota lain dan belum pernah masuk pengecekan)
async function hapusNota(id: number): Promise<FormState> {
  const nota = await prisma.barangMasuk.findUnique({
    where: { id },
    select: { foto: true, items: { select: { barangId: true } } },
  });
  if (!nota) return { error: "Catatan barang masuk tidak ditemukan" };

  const barangIds = [...new Set(nota.items.map((i) => i.barangId))];

  const jumlahBarangTerhapus = await prisma.$transaction(async (tx) => {
    await tx.barangMasuk.delete({ where: { id } }); // isi nota ikut terhapus (Cascade)

    const tanpaRiwayat = await tx.barang.findMany({
      where: {
        id: { in: barangIds },
        masukItems: { none: {} },
        pengecekanItems: { none: {} },
      },
      select: { id: true },
    });
    if (tanpaRiwayat.length) {
      await tx.barang.deleteMany({ where: { id: { in: tanpaRiwayat.map((b) => b.id) } } });
    }
    return tanpaRiwayat.length;
  });

  if (nota.foto) await hapusFotoNota(nota.foto);

  revalidatePath("/admin/barang-masuk");
  revalidatePath("/admin/barang");
  revalidatePath("/admin/lokasi");
  revalidatePath("/admin");
  return {
    ok: true,
    pesan: jumlahBarangTerhapus
      ? `Nota dihapus beserta ${jumlahBarangTerhapus} barang yang tidak punya riwayat lain`
      : "Catatan barang masuk berhasil dihapus",
  };
}

export async function hapusBarangMasuk(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const id = Number(formData.get("id"));
  if (!id) return { error: "Data tidak valid" };
  return hapusNota(id);
}

export async function hapusBarangMasukDariDetail(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const id = Number(formData.get("id"));
  if (!id) return { error: "Data tidak valid" };
  const hasil = await hapusNota(id);
  if (hasil.ok) redirect("/admin/barang-masuk");
  return hasil;
}