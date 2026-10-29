import "server-only";
import { prisma } from "@/lib/prisma";
import { rentangTahunKalender } from "@/lib/format";

export type Rentang = { gte: Date; lt?: Date };

export function daftarTahunAjaran() {
  return prisma.tahunAjaran.findMany({ orderBy: { mulai: "desc" } });
}

// Rentang tanggal sebuah tahun ajaran: dari tanggal mulainya
// sampai tahun ajaran berikutnya mulai
export async function rentangTahunAjaran(id: number): Promise<Rentang> {
  const ta = await prisma.tahunAjaran.findUniqueOrThrow({ where: { id } });
  const berikut = await prisma.tahunAjaran.findFirst({
    where: { mulai: { gt: ta.mulai } },
    orderBy: { mulai: "asc" },
  });
  return berikut ? { gte: ta.mulai, lt: berikut.mulai } : { gte: ta.mulai };
}

// Tahun ajaran yang sedang berjalan
export function tahunAjaranAktif() {
  return prisma.tahunAjaran.findFirst({
    where: { mulai: { lte: new Date() } },
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
    return { kode, rentang: await rentangTahunAjaran(n), label: `Tahun Ajaran ${ta.nama}` };
  }

  return null;
}