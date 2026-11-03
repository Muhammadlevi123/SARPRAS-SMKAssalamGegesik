import type { prisma } from "@/lib/prisma";

// Kode sekolah di depan setiap kode barang
export const KODE_SEKOLAH = "ASG";

// ASG-ELK-26-0012
export function formatKode(kodeKategori: string, tahun: number, nomor: number) {
  return `${KODE_SEKOLAH}-${kodeKategori}-${String(tahun).slice(-2)}-${String(nomor).padStart(4, "0")}`;
}

/**
 * Ambil nomor urut berikutnya dari kategori lalu buat kode barang.
 * Nomor dinaikkan langsung di database (increment), jadi aman walaupun
 * dua orang menambah barang di waktu yang sama, dan nomor tidak pernah dipakai ulang.
 * Panggil di dalam prisma.$transaction bersama penyimpanan barangnya.
 */
export async function buatKodeBarang(
  tx: Pick<typeof prisma, "kategori">,
  kategoriId: number,
  tahun: number,
) {
  const k = await tx.kategori.update({
    where: { id: kategoriId },
    data: { noTerakhir: { increment: 1 } },
    select: { kode: true, noTerakhir: true },
  });
  return formatKode(k.kode, tahun, k.noTerakhir);
}

// Hapus SEMUA kategori yang sudah tidak punya barang sama sekali
export async function bersihkanKategoriKosong(tx: Pick<typeof prisma, "kategori">) {
  await tx.kategori.deleteMany({ where: { barang: { none: {} } } });
}

// Usulan kode kategori 3 huruf dari nama yang belum terpakai, misal "Alat Praktik" → "ALP"
export function usulKodeKategori(nama: string, terpakai: Set<string>) {
  const kata = nama.toUpperCase().replace(/[^A-Z ]/g, "").split(/\s+/).filter(Boolean);
  const huruf = kata.join("") || "XXX";

  // 1) Huruf awal tiap kata, dilengkapi huruf berikutnya: "Alat Praktik" → ALP, "Elektronik" → ELE
  const awal = (kata.map((k) => k[0]).join("") + huruf.slice(1)).slice(0, 3).padEnd(3, "X");
  if (!terpakai.has(awal)) return awal;

  // 2) Huruf pertama + kombinasi 2 huruf lain dari nama
  for (let i = 1; i < huruf.length; i++) {
    for (let j = i + 1; j < huruf.length; j++) {
      const usul = huruf[0] + huruf[i] + huruf[j];
      if (!terpakai.has(usul)) return usul;
    }
  }

  // 3) Cadangan: huruf pertama + 2 huruf A–Z
  const AZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const a of AZ) for (const b of AZ) if (!terpakai.has(huruf[0] + a + b)) return huruf[0] + a + b;
  return "XXX";
}