import "server-only";
import { prisma } from "@/lib/prisma";
import { linkBarang, qrSvg } from "@/lib/qr";

export const MAKS_LABEL = 1000; // batas sekali cetak

export type DataLabel = { id: number; kode: string; ke: number; dari: number };

/**
 * Siapkan label untuk dicetak: satu label per unit (1/30, 2/30, ...).
 * Pilih satu barang (id), atau semua barang di lokasi / kategori tertentu.
 */
export async function ambilLabel(pilihan: { id?: number; lokasiId?: number; kategoriId?: number }) {
  const barang = await prisma.barang.findMany({
    where: { id: pilihan.id, lokasiId: pilihan.lokasiId, kategoriId: pilihan.kategoriId },
    orderBy: [{ lokasi: { nama: "asc" } }, { kode: "asc" }],
    select: { id: true, kode: true },
  });

  // Jumlah unit tiap barang (dari barang masuk)
  const stok = await prisma.barangMasukItem.groupBy({
    by: ["barangId"],
    where: { barangId: { in: barang.map((b) => b.id) } },
    _sum: { jumlah: true },
  });
  const stokMap = new Map(stok.map((s) => [s.barangId, s._sum.jumlah ?? 0]));

  const semua: DataLabel[] = barang.flatMap((b) => {
    const n = Math.max(1, stokMap.get(b.id) ?? 0);
    return Array.from({ length: n }, (_, i) => ({ id: b.id, kode: b.kode, ke: i + 1, dari: n }));
  });

  // QR dibuat sekali per barang (label per unit memakai QR yang sama)
  const qr: Record<number, string> = Object.fromEntries(
    await Promise.all(barang.map(async (b) => [b.id, await qrSvg(linkBarang(b.id))] as const)),
  );

  return { label: semua.slice(0, MAKS_LABEL), total: semua.length, qr };
}