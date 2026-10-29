"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isUniqueError } from "@/lib/prismaError";
import type { FormState } from "@/lib/formState";

export async function simpanLokasi(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();

  const id = Number(formData.get("id")) || 0;
  const nama = String(formData.get("nama") ?? "").trim();
  const penanggungJawab = String(formData.get("penanggungJawab") ?? "").trim() || null;

  if (!nama) return { error: "Nama lokasi wajib diisi" };
  if (nama.length > 191 || (penanggungJawab?.length ?? 0) > 191) {
    return { error: "Isian terlalu panjang (maks. 191 karakter)" };
  }

  try {
    if (id) {
      await prisma.lokasi.update({ where: { id }, data: { nama, penanggungJawab } });
    } else {
      await prisma.lokasi.create({ data: { nama, penanggungJawab } });
    }
  } catch (e) {
    if (isUniqueError(e)) return { error: `Lokasi "${nama}" sudah ada` };
    throw e;
  }

  revalidatePath("/admin/lokasi");
  revalidatePath("/admin");
  return {
    ok: true,
    pesan: id ? `Lokasi "${nama}" berhasil diperbarui` : `Lokasi "${nama}" berhasil ditambahkan`,
  };
}

export async function hapusLokasi(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();

  const id = Number(formData.get("id"));
  if (!id) return { error: "Data tidak valid" };

  const lokasi = await prisma.lokasi.findUnique({
    where: { id },
    select: { nama: true, _count: { select: { barang: true, pengecekan: true } } },
  });
  if (!lokasi) return { error: "Lokasi tidak ditemukan" };
  if (lokasi._count.barang > 0) {
    return { error: `Lokasi "${lokasi.nama}" masih punya ${lokasi._count.barang} barang. Pindahkan atau hapus dulu.` };
  }
  if (lokasi._count.pengecekan > 0) {
    return { error: `Lokasi "${lokasi.nama}" sudah punya riwayat pengecekan, tidak bisa dihapus.` };
  }

  await prisma.lokasi.delete({ where: { id } });

  revalidatePath("/admin/lokasi");
  revalidatePath("/admin");
  return { ok: true, pesan: `Lokasi "${lokasi.nama}" berhasil dihapus` };
}