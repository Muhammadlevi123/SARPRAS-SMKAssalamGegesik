import "server-only";
import { prisma } from "@/lib/prisma";

// Jumlah seharusnya tiap barang = total isi nota barang masuk sampai tanggal tertentu.
// Hasil: Map<barangId, jumlah>
export async function stokSampai(sampai: Date) {
  const rows = await prisma.barangMasukItem.groupBy({
    by: ["barangId"],
    where: { barangMasuk: { tanggal: { lte: sampai } } },
    _sum: { jumlah: true },
  });
  return new Map(rows.map((r) => [r.barangId, r._sum.jumlah ?? 0]));
}

type CekUntukRekap = {
  tanggal: Date;
  items: { barangId: number; jumlahAda: number; rusakRingan: number; rusakBerat: number }[];
};

export type RekapKondisi = { baik: number; kurang: number; rusak: number; hilang: number };

// Jumlahkan kondisi dari beberapa pengecekan.
// Hilang = jumlah seharusnya (per tanggal pengecekan) - jumlah yang ditemukan
export async function rekapKondisi(daftar: CekUntukRekap[]): Promise<RekapKondisi> {
  const total: RekapKondisi = { baik: 0, kurang: 0, rusak: 0, hilang: 0 };
  const stokPerTanggal = new Map<number, Map<number, number>>();

  for (const c of daftar) {
    const kunci = c.tanggal.getTime();
    let stok = stokPerTanggal.get(kunci);
    if (!stok) {
      stok = await stokSampai(c.tanggal);
      stokPerTanggal.set(kunci, stok);
    }

    for (const i of c.items) {
      total.baik += i.jumlahAda - i.rusakRingan - i.rusakBerat;
      total.kurang += i.rusakRingan;
      total.rusak += i.rusakBerat;
      total.hilang += Math.max(0, (stok.get(i.barangId) ?? 0) - i.jumlahAda);
    }
  }

  return total;
}