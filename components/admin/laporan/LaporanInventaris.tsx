import { prisma } from "@/lib/prisma";
import { stokSampai } from "@/lib/stok";
import { fmtAngka, fmtBulan } from "@/lib/format";
import type { Rentang } from "@/lib/periode";
import { judulGrup, tabel, td, tdAngka, th, thAngka } from "./gaya";

export default async function LaporanInventaris({ rentang, lokasiId }: { rentang: Rentang; lokasiId: number }) {
  // Posisi per akhir periode (atau hari ini jika periodenya masih berjalan)
  const sekarang = new Date();
  const akhir = rentang.lt && rentang.lt < sekarang ? new Date(rentang.lt.getTime() - 1) : sekarang;

  const [barang, stok, cek] = await Promise.all([
    prisma.barang.findMany({
      where: { lokasiId: lokasiId || undefined, createdAt: { lte: akhir } },
      include: { lokasi: { select: { nama: true, penanggungJawab: true } } },
      orderBy: [{ lokasi: { nama: "asc" } }, { nama: "asc" }],
    }),
    stokSampai(akhir),
    prisma.pengecekan.findFirst({
      where: { tanggal: { lte: akhir } },
      orderBy: { tanggal: "desc" },
      include: { items: true },
    }),
  ]);

  const itemMap = new Map((cek?.items ?? []).map((i) => [i.barangId, i]));

  const grup = new Map<string, { pj: string | null; items: typeof barang }>();
  for (const b of barang) {
    const g = grup.get(b.lokasi.nama) ?? { pj: b.lokasi.penanggungJawab, items: [] };
    g.items.push(b);
    grup.set(b.lokasi.nama, g);
  }

  if (barang.length === 0) return <p className="text-center text-sm text-gray-500">Tidak ada data barang.</p>;

  return (
    <div>
      <p className="mb-3 text-sm text-gray-600">
        Kondisi berdasarkan{" "}
        {cek ? <b>pengecekan {fmtBulan(cek.tanggal)}</b> : <b>belum ada pengecekan</b>}.
      </p>

      <table className={tabel}>
        <thead>
          <tr>
            <th className={th}>No</th>
            <th className={th}>Kode</th>
            <th className={th}>Nama Barang</th>
            <th className={th}>Kategori</th>
            <th className={thAngka}>Jumlah</th>
            <th className={thAngka}>Baik</th>
            <th className={thAngka}>R. Ringan</th>
            <th className={thAngka}>R. Berat</th>
            <th className={thAngka}>Hilang</th>
          </tr>
        </thead>
        {[...grup.entries()].map(([lokasi, g]) => (
          <tbody key={lokasi}>
            <tr>
              <td colSpan={9} className={judulGrup}>
                {lokasi} {g.pj && <span className="font-normal normal-case">· PJ: {g.pj}</span>}
              </td>
            </tr>
            {g.items.map((b, i) => {
              const jumlah = stok.get(b.id) ?? 0;
              const item = itemMap.get(b.id);
              const kosong = <span className="text-gray-400">–</span>;
              return (
                <tr key={b.id}>
                  <td className={td}>{i + 1}</td>
                  <td className={`${td} font-mono text-xs`}>{b.kode ?? "–"}</td>
                  <td className={td}>{b.nama}</td>
                  <td className={td}>{b.kategori ?? "–"}</td>
                  <td className={tdAngka}>{fmtAngka(jumlah)} {b.satuan}</td>
                  <td className={tdAngka}>{item ? fmtAngka(item.jumlahAda - item.rusakRingan - item.rusakBerat) : kosong}</td>
                  <td className={tdAngka}>{item ? fmtAngka(item.rusakRingan) : kosong}</td>
                  <td className={tdAngka}>{item ? fmtAngka(item.rusakBerat) : kosong}</td>
                  <td className={tdAngka}>{item ? fmtAngka(Math.max(0, jumlah - item.jumlahAda)) : kosong}</td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}