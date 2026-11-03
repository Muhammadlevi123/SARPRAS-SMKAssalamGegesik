"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isUniqueError } from "@/lib/prismaError";
import { bagianWIB } from "@/lib/format";
import { bersihkanKategoriKosong, buatKodeBarang, usulKodeKategori } from "@/lib/kodeBarang";
import type { FormState } from "@/lib/formState";

const teks = (v: FormDataEntryValue | null) => String(v ?? "").trim();

// Kesalahan yang pesannya boleh langsung ditampilkan ke pengguna
class Gagal extends Error {}

function segarkan() {
  revalidatePath("/admin/barang");
  revalidatePath("/admin/kategori");
  revalidatePath("/admin/lokasi");
  revalidatePath("/admin");
}

export async function simpanBarang(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();

  const id = Number(formData.get("id")) || 0;
  const nama = teks(formData.get("nama"));
  const merk = teks(formData.get("merk")) || null;
  const namaKategori = teks(formData.get("kategori"));
  const kodeKategoriBaru = teks(formData.get("kodeKategori")).toUpperCase();
  const tahun = Number(formData.get("tahun"));
  const satuan = teks(formData.get("satuan"));
  const lokasiId = Number(formData.get("lokasiId"));
  const tahunIni = bagianWIB(new Date()).y;

  if (!nama) return { error: "Nama barang wajib diisi" };
  if (!namaKategori) return { error: "Kategori wajib diisi" };
  if (!Number.isInteger(tahun) || tahun < 1990 || tahun > tahunIni) {
    return { error: `Tahun perolehan harus antara 1990 dan ${tahunIni}` };
  }
  if (!satuan) return { error: "Satuan wajib diisi" };
  if (!Number.isInteger(lokasiId) || lokasiId <= 0) return { error: "Pilih lokasi" };
  if ([nama, merk, namaKategori, satuan].some((v) => (v?.length ?? 0) > 191)) {
    return { error: "Isian terlalu panjang (maks. 191 karakter)" };
  }

  const adaLokasi = await prisma.lokasi.count({ where: { id: lokasiId } });
  if (!adaLokasi) return { error: "Lokasi tidak ditemukan" };

  // Nama + merk + lokasi tidak boleh kembar (termasuk yang tanpa merk)
  const kembar = await prisma.barang.findFirst({
    where: { nama, merk, lokasiId, NOT: id ? { id } : undefined },
    select: { id: true },
  });
  if (kembar) {
    return {
      error: merk
        ? `"${nama}" merk ${merk} sudah ada di lokasi ini`
        : `"${nama}" (tanpa merk) sudah ada di lokasi ini`,
    };
  }

  let hasil: { kode: string; kodeBaru: boolean };
  try {
    hasil = await prisma.$transaction(async (tx) => {
      // 1. Kategori: pakai yang sudah ada, atau otomatis dibuat baru
      let kategori = await tx.kategori.findUnique({ where: { nama: namaKategori }, select: { id: true } });
      if (!kategori) {
        let kode = kodeKategoriBaru;
        if (!kode) {
          const terpakai = new Set((await tx.kategori.findMany({ select: { kode: true } })).map((k) => k.kode));
          kode = usulKodeKategori(namaKategori, terpakai);
        }
        if (!/^[A-Z]{3}$/.test(kode)) throw new Gagal("Kode kategori harus 3 huruf, misal ELK");
        kategori = await tx.kategori.create({ data: { nama: namaKategori, kode }, select: { id: true } });
      }

      const data = { nama, merk, satuan, lokasiId, kategoriId: kategori.id, tahunPerolehan: tahun };
      let kode: string;
      let kodeBaru = true;

      if (id) {
        // 2a. Edit: kode dibuat ulang hanya kalau kategori atau tahun berubah
        const lama = await tx.barang.findUnique({
          where: { id },
          select: { kode: true, kategoriId: true, tahunPerolehan: true },
        });
        if (!lama) throw new Gagal("Barang tidak ditemukan");

        kodeBaru = lama.kategoriId !== kategori.id || lama.tahunPerolehan !== tahun;
        kode = kodeBaru ? await buatKodeBarang(tx, kategori.id, tahun) : lama.kode;
        await tx.barang.update({ where: { id }, data: { ...data, kode } });
      } else {
        // 2b. Tambah: selalu dapat kode baru
        kode = await buatKodeBarang(tx, kategori.id, tahun);
        await tx.barang.create({ data: { ...data, kode } });
      }

      // 3. Kategori yang sudah tidak punya barang dihapus otomatis
      await bersihkanKategoriKosong(tx);
      return { kode, kodeBaru };
    });
  } catch (e) {
    if (e instanceof Gagal) return { error: e.message };
    if (isUniqueError(e)) return { error: "Kode kategori sudah dipakai kategori lain, ganti kodenya" };
    throw e;
  }

  segarkan();

  if (!id) return { ok: true, pesan: `Barang "${nama}" ditambahkan dengan kode ${hasil.kode}` };
  return {
    ok: true,
    pesan: hasil.kodeBaru
      ? `Barang "${nama}" diperbarui. Kode baru ${hasil.kode}, cetak ulang labelnya.`
      : `Barang "${nama}" berhasil diperbarui`,
  };
}

export async function hapusBarang(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();

  const id = Number(formData.get("id"));
  if (!id) return { error: "Data tidak valid" };

  const barang = await prisma.barang.findUnique({
    where: { id },
    select: { nama: true, _count: { select: { masukItems: true, pengecekanItems: true } } },
  });
  if (!barang) return { error: "Barang tidak ditemukan" };
  if (barang._count.masukItems || barang._count.pengecekanItems) {
    return { error: `"${barang.nama}" sudah punya riwayat barang masuk/pengecekan, tidak bisa dihapus.` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.barang.delete({ where: { id } });
    // Kategori yang sudah tidak punya barang dihapus otomatis
    await bersihkanKategoriKosong(tx);
  });

  segarkan();
  return { ok: true, pesan: `Barang "${barang.nama}" berhasil dihapus` };
}