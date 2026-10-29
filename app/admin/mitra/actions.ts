"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isUniqueError } from "@/lib/prismaError";
import type { FormState } from "@/lib/formState";

export async function simpanMitra(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();

  const id = Number(formData.get("id")) || 0;
  const nama = String(formData.get("nama") ?? "").trim();
  const kontak = String(formData.get("kontak") ?? "").trim() || null;

  if (!nama) return { error: "Nama mitra wajib diisi" };
  if (nama.length > 191 || (kontak?.length ?? 0) > 191) {
    return { error: "Isian terlalu panjang (maks. 191 karakter)" };
  }

  try {
    if (id) {
      await prisma.mitra.update({ where: { id }, data: { nama, kontak } });
    } else {
      await prisma.mitra.create({ data: { nama, kontak } });
    }
  } catch (e) {
    if (isUniqueError(e)) return { error: `Mitra "${nama}" sudah ada` };
    throw e;
  }

  revalidatePath("/admin/mitra");
  return {
    ok: true,
    pesan: id ? `Mitra "${nama}" berhasil diperbarui` : `Mitra "${nama}" berhasil ditambahkan`,
  };
}

export async function hapusMitra(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();

  const id = Number(formData.get("id"));
  if (!id) return { error: "Data tidak valid" };

  const mitra = await prisma.mitra.findUnique({ where: { id }, select: { nama: true } });
  if (!mitra) return { error: "Mitra tidak ditemukan" };

  // Riwayat barang masuk tetap ada, kolom mitranya otomatis jadi kosong (onDelete: SetNull)
  await prisma.mitra.delete({ where: { id } });

  revalidatePath("/admin/mitra");
  revalidatePath("/admin/barang-masuk");
  return { ok: true, pesan: `Mitra "${mitra.nama}" berhasil dihapus` };
}