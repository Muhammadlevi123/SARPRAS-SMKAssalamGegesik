"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isUniqueError } from "@/lib/prismaError";
import { bagianWIB, parseTanggal } from "@/lib/format";
import type { FormState } from "@/lib/formState";

const teks = (v: FormDataEntryValue | null) => String(v ?? "").trim();

function segarkan() {
  revalidatePath("/admin/tahun-ajaran");
  revalidatePath("/admin/laporan");
  revalidatePath("/admin");
}

export async function simpanTahunAjaran(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();

  const id = Number(formData.get("id")) || 0;
  const mulai = parseTanggal(teks(formData.get("mulai")));
  const selesai = parseTanggal(teks(formData.get("selesai")));

  if (!mulai || !selesai) return { error: "Tanggal mulai dan selesai wajib diisi" };
  if (selesai <= mulai) return { error: "Tanggal selesai harus setelah tanggal mulai" };

  // Nama otomatis dari tahunnya, misal 2026/2027
  const tahunMulai = bagianWIB(mulai).y;
  const tahunSelesai = bagianWIB(selesai).y;
  if (tahunSelesai !== tahunMulai + 1) {
    return { error: "Tahun ajaran harus dari satu tahun ke tahun berikutnya, misal Juli 2026 – Juni 2027" };
  }
  const nama = `${tahunMulai}/${tahunSelesai}`;

  // Rentang tanggal tidak boleh bertabrakan dengan tahun ajaran lain
  const tabrakan = await prisma.tahunAjaran.findFirst({
    where: { id: { not: id }, mulai: { lte: selesai }, selesai: { gte: mulai } },
    select: { nama: true },
  });
  if (tabrakan) return { error: `Tanggalnya bertabrakan dengan tahun ajaran ${tabrakan.nama}` };

  try {
    if (id) {
      await prisma.tahunAjaran.update({ where: { id }, data: { nama, mulai, selesai } });
    } else {
      await prisma.tahunAjaran.create({ data: { nama, mulai, selesai } });
    }
  } catch (e) {
    if (isUniqueError(e)) return { error: `Tahun ajaran ${nama} sudah ada` };
    throw e;
  }

  segarkan();
  return { ok: true, pesan: `Tahun ajaran ${nama} tersimpan` };
}

export async function hapusTahunAjaran(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();

  const id = Number(formData.get("id"));
  if (!id) return { error: "Data tidak valid" };

  // Aman dihapus: data barang masuk & pengecekan hanya menyimpan tanggal
  await prisma.tahunAjaran.delete({ where: { id } });

  segarkan();
  return { ok: true };
}