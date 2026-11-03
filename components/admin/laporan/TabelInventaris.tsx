import { fmtAngka, fmtTanggalPendek } from "@/lib/format";
import type { GrupInventaris } from "@/lib/laporan/data";
import { judulGrup, tabel, td, tdMerah, tdTengah, th } from "./gaya";

// Sel teks: kosong → "–" di tengah
function Sel({ isi, className = "" }: { isi?: string | null; className?: string }) {
  return isi ? <td className={`${td} ${className}`}>{isi}</td> : <td className={tdTengah}>–</td>;
}

export default function TabelInventaris({ data, satuLokasi }: { data: GrupInventaris[]; satuLokasi: boolean }) {
  if (data.length === 0) return <p className="py-8 text-center text-[10pt]">Tidak ada data barang.</p>;

  return (
    <table className={tabel}>
      <thead>
        <tr>
          <th rowSpan={2} className={th}>No.</th>
          <th rowSpan={2} className={th}>Kode Barang</th>
          <th rowSpan={2} className={th}>Nama Barang</th>
          <th rowSpan={2} className={th}>Merk</th>
          <th rowSpan={2} className={th}>Jumlah</th>
          <th rowSpan={2} className={th}>Satuan</th>
          <th rowSpan={2} className={th}>Tahun Perolehan</th>
          <th rowSpan={2} className={th}>Sumber Perolehan</th>
          <th colSpan={3} className={th}>Kondisi Terakhir</th>
          <th rowSpan={2} className={th}>Keterangan</th>
        </tr>
        <tr>
          <th className={th}>Baik</th>
          <th className={th}>Kurang Baik</th>
          <th className={th}>Rusak Berat</th>
        </tr>
      </thead>

      {data.map((g) => (
        <tbody key={g.id}>
          {/* Nama lokasi tidak perlu kalau hanya satu lokasi (sudah ada di judul) */}
          {!satuLokasi && (
            <tr>
              <td colSpan={12} className={judulGrup}>
                {g.nama}{" "}
                <span className="font-normal normal-case">
                  {g.pj && <>· PJ: {g.pj} </>}·{" "}
                  {g.tanggalCek ? (
                    `kondisi per cek ${fmtTanggalPendek(g.tanggalCek)}`
                  ) : (
                    <span className="font-semibold text-red-700">belum pernah dicek</span>
                  )}
                </span>
              </td>
            </tr>
          )}

          {g.barang.map((b, i) => (
            <tr key={b.id}>
              <td className={tdTengah}>{i + 1}</td>
              <Sel isi={b.kode} className="font-mono" />
              <td className={td}>{b.nama}</td>
              <Sel isi={b.merk} />
              <td className={tdTengah}>{fmtAngka(b.jumlah)}</td>
              <td className={td}>{b.satuan}</td>
              <td className={tdTengah}>{b.tahun || "–"}</td>
              <Sel isi={b.sumber} />
              {b.kondisi ? (
                <>
                  <td className={tdTengah}>{fmtAngka(b.kondisi.baik)}</td>
                  <td className={tdTengah}>{fmtAngka(b.kondisi.kurang)}</td>
                  <td className={tdTengah}>{fmtAngka(b.kondisi.rusak)}</td>
                </>
              ) : (
                <td colSpan={3} className={tdMerah}>Belum dicek</td>
              )}
              <Sel isi={b.keterangan} />
            </tr>
          ))}
        </tbody>
      ))}
    </table>
  );
}