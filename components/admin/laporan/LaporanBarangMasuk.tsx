import { prisma } from "@/lib/prisma";
import { DAFTAR_SUMBER, SUMBER_LABEL, fmtAngka, fmtRupiah, fmtTanggalPendek } from "@/lib/format";
import type { Rentang } from "@/lib/periode";
import { tabel, td, tdAngka, th, thAngka } from "./gaya";

export default async function LaporanBarangMasuk({ rentang, lokasiId }: { rentang: Rentang; lokasiId: number }) {
  const daftar = await prisma.penambahan.findMany({
    where: { tanggal: rentang, barang: lokasiId ? { lokasiId } : undefined },
    include: {
      barang: { select: { nama: true, satuan: true, lokasi: { select: { nama: true } } } },
      mitra: { select: { nama: true } },
    },
    orderBy: [{ tanggal: "asc" }, { id: "asc" }],
  });

  if (daftar.length === 0) {
    return <p className="text-center text-sm text-gray-500">Tidak ada barang masuk pada periode ini.</p>;
  }

  // Rekap per sumber
  const rekap = DAFTAR_SUMBER.map((s) => {
    const baris = daftar.filter((p) => p.sumber === s);
    return {
      sumber: s,
      catatan: baris.length,
      unit: baris.reduce((t, p) => t + p.jumlah, 0),
      nilai: baris.reduce((t, p) => t + (p.harga ?? 0) * p.jumlah, 0),
    };
  }).filter((r) => r.catatan > 0);

  const totalNilai = rekap.reduce((t, r) => t + r.nilai, 0);

  return (
    <div className="flex flex-col gap-6">
      <table className={tabel}>
        <thead>
          <tr>
            <th className={th}>No</th>
            <th className={th}>Tanggal</th>
            <th className={th}>Barang</th>
            <th className={th}>Lokasi</th>
            <th className={thAngka}>Jumlah</th>
            <th className={th}>Sumber</th>
            <th className={th}>Mitra</th>
            <th className={thAngka}>Harga Satuan</th>
            <th className={thAngka}>Total</th>
          </tr>
        </thead>
        <tbody>
          {daftar.map((p, i) => (
            <tr key={p.id}>
              <td className={td}>{i + 1}</td>
              <td className={`${td} whitespace-nowrap`}>{fmtTanggalPendek(p.tanggal)}</td>
              <td className={td}>
                {p.barang.nama}
                {p.keterangan && <span className="block text-xs italic text-gray-500">{p.keterangan}</span>}
              </td>
              <td className={td}>{p.barang.lokasi.nama}</td>
              <td className={`${tdAngka} whitespace-nowrap`}>{fmtAngka(p.jumlah)} {p.barang.satuan}</td>
              <td className={td}>{SUMBER_LABEL[p.sumber]}</td>
              <td className={td}>{p.mitra?.nama ?? "–"}</td>
              <td className={`${tdAngka} whitespace-nowrap`}>{p.harga !== null ? fmtRupiah(p.harga) : "–"}</td>
              <td className={`${tdAngka} whitespace-nowrap`}>{p.harga !== null ? fmtRupiah(p.harga * p.jumlah) : "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="print:break-inside-avoid">
        <p className="mb-2 text-sm font-bold">Rekap per Sumber</p>
        <table className={`${tabel} max-w-xl`}>
          <thead>
            <tr>
              <th className={th}>Sumber</th>
              <th className={thAngka}>Catatan</th>
              <th className={thAngka}>Unit</th>
              <th className={thAngka}>Nilai</th>
            </tr>
          </thead>
          <tbody>
            {rekap.map((r) => (
              <tr key={r.sumber}>
                <td className={td}>{SUMBER_LABEL[r.sumber]}</td>
                <td className={tdAngka}>{fmtAngka(r.catatan)}</td>
                <td className={tdAngka}>{fmtAngka(r.unit)}</td>
                <td className={tdAngka}>{r.nilai ? fmtRupiah(r.nilai) : "–"}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className={td}>Total</td>
              <td className={tdAngka}>{fmtAngka(daftar.length)}</td>
              <td className={tdAngka}>{fmtAngka(rekap.reduce((t, r) => t + r.unit, 0))}</td>
              <td className={tdAngka}>{fmtRupiah(totalNilai)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}