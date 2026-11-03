"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import type { FormState } from "@/lib/formState";

// ===== Pasang / ganti / lepas lokasi tanggung jawab user =====
// lokasiId kosong = lepas lokasi (akun kembali "menunggu" dan tidak bisa dipakai)

export async function aturLokasi(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  const lokasiId = Number(formData.get("lokasiId")) || null;
  if (!id) return { error: "Data tidak valid" };

  const user = await prisma.user.findUnique({ where: { id }, select: { nama: true, role: true } });
  if (!user) return { error: "User tidak ditemukan" };
  if (user.role === "ADMIN") return { error: "Admin tidak perlu dipasangkan ke lokasi" };

  let namaLokasi = "";
  if (lokasiId) {
    const lokasi = await prisma.lokasi.findUnique({ where: { id: lokasiId }, select: { nama: true } });
    if (!lokasi) return { error: "Lokasi tidak ditemukan" };
    namaLokasi = lokasi.nama;
  }

  await prisma.user.update({ where: { id }, data: { lokasiId } });

  revalidatePath("/admin/user");
  return {
    ok: true,
    pesan: lokasiId ? `${user.nama} dipasangkan ke ${namaLokasi}` : `Lokasi ${user.nama} dilepas`,
  };
}

// ===== Hapus user =====

export async function hapusUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const saya = await requireAdmin();

  const id = Number(formData.get("id"));
  if (!id) return { error: "Data tidak valid" };
  if (id === saya.id) return { error: "Tidak bisa menghapus akun yang sedang dipakai" };

  await prisma.user.delete({ where: { id } }); // pengajuannya tetap tersimpan (userId jadi kosong)

  revalidatePath("/admin/user");
  return { ok: true };
}