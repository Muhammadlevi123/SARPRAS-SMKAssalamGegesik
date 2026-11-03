import "server-only";
import { prisma } from "@/lib/prisma";
import { rentangTahunKalender } from "@/lib/format";

export type Rentang = { gte: Date; lt?: Date };

const SEHARI = 24 * 60 * 60 * 1000;

export function daftarTahunAjaran() {
  return prisma.tahunAjaran.findMany({ orderBy: { mulai: "desc" } });
}

// Rentang tanggal tahun ajaran: dari tanggal mulai sampai akhir hari tanggal selesai
function rentangDari(ta: { mulai: Date; selesai: Date }): Rentang {
  return { gte: ta.mulai, lt: new Date(ta.selesai.getTime() + SEHARI) };
}

export async function rentangTahunAjaran(id: number): Promise<Rentang> {
  const ta = await prisma.tahunAjaran.findUniqueOrThrow({ where: { id } });
  return rentangDari(ta);
}

// Tahun ajaran yang sedang berjalan (hari ini ada di antara mulai dan selesai)
export function tahunAjaranAktif() {
  const sekarang = new Date();
  return prisma.tahunAjaran.findFirst({
    where: {
      mulai: { lte: sekarang },
      selesai: { gt: new Date(sekarang.getTime() - SEHARI) }, // hari terakhir masih dihitung aktif
    },
    orderBy: { mulai: "desc" },
  });
}

// Kode periode dari dropdown laporan:
//   "ta-3"    → tahun ajaran dengan id 3
//   "th-2026" → tahun anggaran 2026 (Januari–Desember)
export async function resolvePeriode(kode: string | undefined) {
  if (!kode) return null;
  const [jenis, nilai] = kode.split("-");
  const n = Number(nilai);
  if (!Number.isInteger(n) || n <= 0) return null;

  if (jenis === "th") {
    return { kode, rentang: rentangTahunKalender(n) as Rentang, label: `Tahun Anggaran ${n}` };
  }

  if (jenis === "ta") {
    const ta = await prisma.tahunAjaran.findUnique({ where: { id: n } });
    if (!ta) return null;
    return { kode, rentang: rentangDari(ta), label: `Tahun Ajaran ${ta.nama}` };
  }

  return null;
}