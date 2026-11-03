"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { isUniqueError } from "@/lib/prismaError";
import { KODE_SEKOLAH } from "@/lib/kodeBarang";
import type { FormState } from "@/lib/formState";

const teks = (v: FormDataEntryValue | null) => String(v ?? "").trim();

// ===== Ubah nama / kode kategori =====
// Kalau kode diganti, kode semua barang di kategori ini ikut diganti: ASG-ELK-26-0012 → ASG-ELE-26-0012
// (Kategori dihapus otomatis saat barangnya tinggal 0, lihat app/admin/barang/actions.ts)

export async function ubahKategori(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  const nama = teks(formData.get("nama"));
  const kode = teks(formData.get("kode")).toUpperCase();

  if (!id) return { error: "Data tidak valid" };
  if (!nama) return { error: "Nama kategori wajib diisi" };
  if (!/^[A-Z]{3}$/.test(kode)) return { error: "Kode harus 3 huruf, misal ELK" };

  const lama = await prisma.kategori.findUnique({ where: { id }, select: { kode: true } });
  if (!lama) return { error: "Kategori tidak ditemukan" };

  let jumlahDiubah = 0;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.kategori.update({ where: { id }, data: { nama, kode } });
      if (lama.kode === kode) return;

      const awalanLama = `${KODE_SEKOLAH}-${lama.kode}-`;
      const daftar = await tx.barang.findMany({
        where: { kategoriId: id, kode: { startsWith: awalanLama } },
        select: { id: true, kode: true },
      });
      for (const b of daftar) {
        await tx.barang.update({
          where: { id: b.id },
          data: { kode: `${KODE_SEKOLAH}-${kode}-${b.kode.slice(awalanLama.length)}` },
        });
      }
      jumlahDiubah = daftar.length;
    });
  } catch (e) {
    if (isUniqueError(e)) return { error: "Nama atau kode kategori sudah dipakai kategori lain" };
    throw e;
  }

  revalidatePath("/admin/kategori");
  revalidatePath("/admin/barang");
  return {
    ok: true,
    pesan: jumlahDiubah
      ? `Kategori diperbarui. ${jumlahDiubah} kode barang ikut berubah, cetak ulang labelnya.`
      : "Kategori diperbarui",
  };
}