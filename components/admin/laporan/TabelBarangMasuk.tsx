import { fmtAngka, fmtRupiah, fmtTanggalPendek } from "@/lib/format";
import type { DataBarangMasuk } from "@/lib/laporan/data";
import { barisTotal, tabel, td, tdTengah, th } from "./gaya";

function Sel({ isi }: { isi?: string | null }) {
  return isi ? <td className={td}>{isi}</td> : <td className={tdTengah}>–</td>;
}

export default function TabelBarangMasuk({ data, satuLokasi }: { data: DataBarangMasuk; satuLokasi: boolean }) {
  if (data.baris.length === 0) return <p className="py-8 text-center text-[10pt]">Tidak ada barang masuk pada periode ini.</p>;

  const kolom = satuLokasi ? 7 : 8;

  return (
    <div className="flex flex-col gap-5">
      <table className={tabel}>
        <thead>
          <tr>
            <th className={th}>No</th>
            <th className={th}>Tanggal</th>
            <th className={th}>Barang</th>
            {!satuLokasi && <th className={th}>Lokasi</th>}
            <th className={th}>Jumlah</th>
            <th className={th}>Sumber</th>
            <th className={th}>Mitra</th>
            <th className={th}>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.baris.map((b, i) => (
            <tr key={b.id}>
              <td className={tdTengah}>{i + 1}</td>
              <td className={`${td} whitespace-nowrap`}>
                {fmtTanggalPendek(b.tanggal)}
                {b.noNota && <span className="block text-[7pt] text-gray-600">No. {b.noNota}</span>}
              </td>
              <td className={td}>
                {b.barang}
                {b.merk && <span className="text-gray-600"> ({b.merk})</span>}
                {b.keterangan && <span className="block text-[7pt] italic text-gray-600">{b.keterangan}</span>}
              </td>
              {!satuLokasi && <td className={td}>{b.lokasi}</td>}
              <td className={`${tdTengah} whitespace-nowrap`}>
                {fmtAngka(b.jumlah)} {b.satuan}
              </td>
              <td className={td}>{b.sumber}</td>
              <Sel isi={b.mitra} />
              {/* Total pembayaran: satu nota = satu angka, menyatu untuk semua barangnya */}
              {b.nota && (
                <td rowSpan={b.nota.span} className={`${tdTengah} whitespace-nowrap font-semibold`}>
                  {b.nota.total !== null ? fmtRupiah(b.nota.total) : "–"}
                  {b.nota.sebagian && <span className="block text-[6.5pt] font-normal">(barang lokasi ini saja)</span>}
                </td>
              )}
            </tr>
          ))}
          <tr>
            <td colSpan={kolom - 1} className={`${barisTotal} text-right`}>TOTAL</td>
            <td className={`${barisTotal} whitespace-nowrap text-center`}>{fmtRupiah(data.totalNilai)}</td>
          </tr>
        </tbody>
      </table>

      {data.adaSebagian && (
        <p className="-mt-3 text-[7.5pt] text-gray-700">
          Nota berisi barang dari beberapa lokasi hanya dihitung harga barang di lokasi terpilih, tanpa ongkir/biaya lain-lain.
        </p>
      )}

      {/* Rekap per sumber */}
      <div className="break-inside-avoid">
        <p className="mb-1 text-[9pt] font-bold">Rekap per Sumber</p>
        <table className={`${tabel} max-w-[12cm]`}>
          <thead>
            <tr>
              <th className={th}>Sumber</th>
              <th className={th}>Nota / Dokumen</th>
              <th className={th}>Unit</th>
              <th className={th}>Nilai</th>
            </tr>
          </thead>
          <tbody>
            {data.rekap.map((r) => (
              <tr key={r.sumber}>
                <td className={td}>{r.sumber}</td>
                <td className={tdTengah}>{fmtAngka(r.nota)}</td>
                <td className={tdTengah}>{fmtAngka(r.unit)}</td>
                <td className={`${tdTengah} whitespace-nowrap`}>{r.nilai ? fmtRupiah(r.nilai) : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}