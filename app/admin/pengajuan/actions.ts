"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import type { FormState } from "@/lib/formState";

const teks = (v: FormDataEntryValue | null) => String(v ?? "").trim();

const MAKS_BARANG = 50;
const MAKS_ALASAN = 2000;

// ===== Kirim pengajuan (khusus USER, untuk lokasinya sendiri) =====

export async function tambahPengajuan(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  if (user.role === "ADMIN") return { error: "Admin tidak membuat pengajuan" };
  if (!user.lokasiId) return { error: "Akun Anda belum ditetapkan ke lokasi. Hubungi admin." };

  const alasan = teks(formData.get("alasan"));
  if (!alasan) return { error: "Alasan wajib diisi" };
  if (alasan.length > MAKS_ALASAN) return { error: `Alasan maksimal ${MAKS_ALASAN} karakter` };

  // Barang dikirim sebagai daftar: nama[], merk[], jumlah[], satuan[]
  const nama = formData.getAll("nama").map(teks);
  const merk = formData.getAll("merk").map(teks);
  const jumlah = formData.getAll("jumlah").map(teks);
  const satuan = formData.getAll("satuan").map(teks);

  const items: { nama: string; merk: string | null; jumlah: number; satuan: string }[] = [];
  for (let i = 0; i < nama.length; i++) {
    // Baris yang benar-benar kosong dilewati
    if (!nama[i] && !merk[i]) continue;

    const ke = `Barang ke-${i + 1}`;
    const n = Number(jumlah[i]);
    if (!nama[i]) return { error: `${ke}: nama barang wajib diisi` };
    if (!Number.isInteger(n) || n < 1) return { error: `${ke}: jumlah minimal 1` };
    if (!satuan[i]) return { error: `${ke}: satuan wajib diisi` };

    items.push({ nama: nama[i], merk: merk[i] || null, jumlah: n, satuan: satuan[i] });
  }

  if (items.length === 0) return { error: "Tambahkan minimal satu barang" };
  if (items.length > MAKS_BARANG) return { error: `Maksimal ${MAKS_BARANG} barang per pengajuan` };

  await prisma.pengajuan.create({
    data: { lokasiId: user.lokasiId, userId: user.id, alasan, items: { create: items } },
  });

  revalidatePath("/admin/pengajuan");
  return { ok: true, pesan: "Pengajuan terkirim" };
}

// ===== Hapus pengajuan =====
// ADMIN boleh menghapus semua, USER hanya pengajuan miliknya

export async function hapusPengajuan(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  const id = Number(formData.get("id"));
  if (!id) return { error: "Data tidak valid" };

  const p = await prisma.pengajuan.findUnique({ where: { id }, select: { userId: true } });
  if (!p) return { error: "Pengajuan tidak ditemukan" };
  if (user.role !== "ADMIN" && p.userId !== user.id) return { error: "Hanya bisa menghapus pengajuan sendiri" };

  await prisma.pengajuan.delete({ where: { id } }); // barangnya ikut terhapus (Cascade)

  revalidatePath("/admin/pengajuan");
  return { ok: true };
}