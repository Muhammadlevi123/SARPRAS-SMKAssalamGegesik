"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isUniqueError } from "@/lib/prismaError";
import type { FormState } from "@/lib/formState";

const teks = (v: FormDataEntryValue | null) => String(v ?? "").trim();

export async function simpanBarang(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();

  const id = Number(formData.get("id")) || 0;
  const kode = teks(formData.get("kode")) || null;
  const nama = teks(formData.get("nama"));
  const merk = teks(formData.get("merk")) || null;
  const kategori = teks(formData.get("kategori")) || null;
  const satuan = teks(formData.get("satuan"));
  const lokasiId = Number(formData.get("lokasiId"));

  if (!nama) return { error: "Nama barang wajib diisi" };
  if (!satuan) return { error: "Satuan wajib diisi" };
  if (!Number.isInteger(lokasiId) || lokasiId <= 0) return { error: "Pilih lokasi" };
  if ([kode, nama, merk, kategori, satuan].some((v) => (v?.length ?? 0) > 191)) {
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

  const data = { kode, nama, merk, kategori, satuan, lokasiId };

  try {
    if (id) {
      await prisma.barang.update({ where: { id }, data });
    } else {
      await prisma.barang.create({ data });
    }
  } catch (e) {
    if (isUniqueError(e)) return { error: "Kode barang sudah dipakai barang lain" };
    throw e;
  }

  revalidatePath("/admin/barang");
  revalidatePath("/admin/lokasi");
  revalidatePath("/admin");
  return {
    ok: true,
    pesan: id ? `Barang "${nama}" berhasil diperbarui` : `Barang "${nama}" berhasil ditambahkan`,
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

  await prisma.barang.delete({ where: { id } });

  revalidatePath("/admin/barang");
  revalidatePath("/admin/lokasi");
  revalidatePath("/admin");
  return { ok: true, pesan: `Barang "${barang.nama}" berhasil dihapus` };
}