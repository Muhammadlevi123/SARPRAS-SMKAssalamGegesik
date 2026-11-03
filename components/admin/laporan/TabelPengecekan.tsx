import { fmtAngka, fmtTanggalPendek } from "@/lib/format";
import type { GrupPengecekan } from "@/lib/laporan/data";
import { judulGrup, tabel, td, tdMerah, tdTengah, th } from "./gaya";

export default function TabelPengecekan({ data, satuLokasi }: { data: GrupPengecekan[]; satuLokasi: boolean }) {
  if (data.length === 0) return <p className="py-8 text-center text-[10pt]">Belum ada lokasi yang memiliki barang.</p>;

  return (
    <table className={tabel}>
      <thead>
        <tr>
          <th className={th}>No.</th>
          <th className={th}>Tanggal</th>
          <th className={th}>Petugas</th>
          <th className={th}>Total Barang</th>
          <th className={th}>Baik</th>
          <th className={th}>Kurang Baik</th>
          <th className={th}>Rusak Berat</th>
          <th className={th}>Hilang</th>
        </tr>
      </thead>

      {data.map((g) => (
        <tbody key={g.id}>
          {!satuLokasi && (
            <tr>
              <td colSpan={8} className={judulGrup}>
                {g.nama}{" "}
                <span className="font-normal normal-case">
                  {g.pj && <>· PJ: {g.pj} </>}·{" "}
                  {g.cek.length > 0 ? (
                    `${g.cek.length} pengecekan`
                  ) : (
                    <span className="font-semibold text-red-700">belum pernah dicek</span>
                  )}
                </span>
              </td>
            </tr>
          )}

          {g.cek.length === 0 ? (
            <tr>
              <td colSpan={8} className={tdMerah}>Belum dicek</td>
            </tr>
          ) : (
            g.cek.map((c, i) => (
              <tr key={c.id}>
                <td className={tdTengah}>{i + 1}</td>
                <td className={`${td} whitespace-nowrap`}>{fmtTanggalPendek(c.tanggal)}</td>
                <td className={td}>{c.petugas}</td>
                <td className={tdTengah}>{fmtAngka(c.total)}</td>
                <td className={tdTengah}>{fmtAngka(c.baik)}</td>
                <td className={tdTengah}>{fmtAngka(c.kurang)}</td>
                <td className={tdTengah}>{fmtAngka(c.rusak)}</td>
                <td className={tdTengah}>{fmtAngka(c.hilang)}</td>
              </tr>
            ))
          )}
        </tbody>
      ))}
    </table>
  );
}