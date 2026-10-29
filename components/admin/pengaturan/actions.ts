"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isUniqueError } from "@/lib/prismaError";
import { parseTanggal } from "@/lib/format";
import type { FormState } from "@/lib/formState";

const teks = (v: FormDataEntryValue | null) => String(v ?? "").trim();

// ===== Tahun Ajaran =====

export async function simpanTahunAjaran(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();

  const id = Number(formData.get("id")) || 0;
  const nama = teks(formData.get("nama"));
  const mulai = parseTanggal(teks(formData.get("mulai")));

  const cocok = /^(\d{4})\/(\d{4})$/.exec(nama);
  if (!cocok || Number(cocok[2]) !== Number(cocok[1]) + 1) {
    return { error: 'Format nama harus seperti "2026/2027"' };
  }
  if (!mulai) return { error: "Tanggal mulai tidak valid" };

  try {
    if (id) {
      await prisma.tahunAjaran.update({ where: { id }, data: { nama, mulai } });
    } else {
      await prisma.tahunAjaran.create({ data: { nama, mulai } });
    }
  } catch (e) {
    if (isUniqueError(e)) return { error: "Nama atau tanggal mulai sudah dipakai tahun ajaran lain" };
    throw e;
  }

  revalidatePath("/admin/pengaturan");
  revalidatePath("/admin/laporan");
  return { ok: true };
}

export async function hapusTahunAjaran(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();

  const id = Number(formData.get("id"));
  if (!id) return { error: "Data tidak valid" };

  // Aman dihapus: data barang masuk & pengecekan hanya menyimpan tanggal
  await prisma.tahunAjaran.delete({ where: { id } });

  revalidatePath("/admin/pengaturan");
  revalidatePath("/admin/laporan");
  return { ok: true };
}

// ===== Ganti Password =====

export async function gantiPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  const lama = String(formData.get("lama") ?? "");
  const baru = String(formData.get("baru") ?? "");
  const ulang = String(formData.get("ulang") ?? "");

  if (!lama || !baru || !ulang) return { error: "Semua isian wajib diisi" };
  if (baru.length < 8) return { error: "Password baru minimal 8 karakter" };
  if (baru !== ulang) return { error: "Konfirmasi password baru tidak sama" };

  const data = await prisma.user.findUnique({ where: { id: user.id }, select: { password: true } });
  if (!data || !(await bcrypt.compare(lama, data.password))) {
    return { error: "Password lama salah" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(baru, 10) },
  });

  return { ok: true };
}