import { prisma } from "@/lib/prisma";
import { stokSampai } from "@/lib/stok";
import { fmtAngka, fmtBulan, fmtTanggalPendek } from "@/lib/format";
import type { Rentang } from "@/lib/periode";
import { tabel, td, tdAngka, th, thAngka } from "./gaya";

export default async function LaporanPengecekan({ rentang, lokasiId }: { rentang: Rentang; lokasiId: number }) {
  const daftar = await prisma.pengecekan.findMany({
    where: { tanggal: rentang },
    orderBy: { tanggal: "asc" },
    include: { items: { include: { barang: { select: { lokasiId: true } } } } },
  });

  if (daftar.length === 0) {
    return <p className="text-center text-sm text-gray-500">Tidak ada pengecekan pada periode ini.</p>;
  }

  // Jumlah seharusnya tiap pengecekan dihitung sampai tanggal pengecekannya
  const stokPerCek = await Promise.all(daftar.map((c) => stokSampai(c.tanggal)));

  const baris = daftar.map((c, idx) => {
    const items = c.items.filter((i) => !lokasiId || i.barang.lokasiId === lokasiId);
    const stok = stokPerCek[idx];
    return {
      id: c.id,
      tanggal: c.tanggal,
      petugas: c.petugas,
      dicek: items.length,
      baik: items.reduce((t, i) => t + i.jumlahAda - i.rusakRingan - i.rusakBerat, 0),
      ringan: items.reduce((t, i) => t + i.rusakRingan, 0),
      berat: items.reduce((t, i) => t + i.rusakBerat, 0),
      hilang: items.reduce((t, i) => t + Math.max(0, (stok.get(i.barangId) ?? 0) - i.jumlahAda), 0),
    };
  });

  return (
    <table className={tabel}>
      <thead>
        <tr>
          <th className={th}>No</th>
          <th className={th}>Bulan</th>
          <th className={th}>Tanggal</th>
          <th className={th}>Petugas</th>
          <th className={thAngka}>Barang Dicek</th>
          <th className={thAngka}>Baik</th>
          <th className={thAngka}>R. Ringan</th>
          <th className={thAngka}>R. Berat</th>
          <th className={thAngka}>Hilang</th>
        </tr>
      </thead>
      <tbody>
        {baris.map((b, i) => (
          <tr key={b.id}>
            <td className={td}>{i + 1}</td>
            <td className={`${td} capitalize`}>{fmtBulan(b.tanggal)}</td>
            <td className={`${td} whitespace-nowrap`}>{fmtTanggalPendek(b.tanggal)}</td>
            <td className={td}>{b.petugas}</td>
            <td className={tdAngka}>{fmtAngka(b.dicek)}</td>
            <td className={tdAngka}>{fmtAngka(b.baik)}</td>
            <td className={tdAngka}>{fmtAngka(b.ringan)}</td>
            <td className={tdAngka}>{fmtAngka(b.berat)}</td>
            <td className={tdAngka}>{fmtAngka(b.hilang)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}