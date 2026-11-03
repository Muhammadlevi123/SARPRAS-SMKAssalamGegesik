import type { ReactNode } from "react";

/**
 * Pembungkus isi laporan yang akan dicetak.
 *
 * Kenapa pakai <table>?
 * Saat dicetak, margin kertas kita set 0 (supaya header/footer Chrome hilang).
 * Akibatnya jarak atas & bawah harus kita buat sendiri. Chrome otomatis
 * mengulang <thead> dan <tfoot> di SETIAP halaman, jadi "jarak-atas" dan
 * "jarak-bawah" di bawah ini muncul di semua halaman, bukan cuma halaman 1.
 *
 * Di layar, jarak-jarak ini tingginya 0 (tidak terlihat).
 * Ukurannya diatur oleh <PengaturanCetak />.
 */
export default function AreaCetak({ children }: { children: ReactNode }) {
  return (
    <table className="area-cetak w-full border-collapse">
      <thead>
        <tr>
          <td className="p-0">
            <div className="jarak-atas" />
          </td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="area-cetak-isi p-0 align-top">{children}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td className="p-0">
            <div className="jarak-bawah" />
          </td>
        </tr>
      </tfoot>
    </table>
  );
}