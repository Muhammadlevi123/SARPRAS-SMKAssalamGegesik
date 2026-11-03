"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* =========================================================
 * Cetak laporan dengan jendela print bawaan browser.
 * - Kertas tetap F4 tegak (ubah KERTAS kalau mau A4).
 * - Margin kertas 0 → header/footer Chrome (tanggal, URL, nomor halaman) hilang.
 *   Jarak tepi dibuat sendiri lewat <AreaCetak />.
 * - Saat print, semua bagian halaman admin (sidebar, kartu, dll.) disembunyikan,
 *   yang tercetak hanya laporan.
 * ========================================================= */

const KERTAS = { lebar: 215, tinggi: 330 }; // F4 tegak (mm). A4 = { lebar: 210, tinggi: 297 }

const MARGIN_SAMPING = 15;
const MARGIN_ATAS = 12;
const MARGIN_BAWAH = 12;

const BATAS_TUNGGU = 1000; // ms, pengaman kalau logo lambat

export default function PengaturanKertas({ judul, kunci }: { judul: string; kunci: string }) {
  const router = useRouter();

  useEffect(() => {
    let batal = false;

    // Tunggu logo selesai digambar (biasanya langsung, karena sudah di-preload)
    const logo = Array.from(document.querySelectorAll<HTMLImageElement>(".area-cetak img")).map((img) =>
      img.decode().catch(() => undefined),
    );
    const batas = new Promise((r) => setTimeout(r, BATAS_TUNGGU));

    Promise.race([Promise.all(logo), batas]).then(() => {
      // Tunggu satu frame supaya halaman selesai digambar, lalu langsung print
      requestAnimationFrame(() => {
        if (batal) return;

        const judulAsli = document.title;
        document.title = judul; // dipakai sebagai nama file saat "Simpan sebagai PDF"

        const selesai = () => {
          window.removeEventListener("afterprint", selesai);
          document.title = judulAsli;
          router.replace("/admin/laporan", { scroll: false }); // bersihkan alamat & laporan tersembunyi
        };
        window.addEventListener("afterprint", selesai);

        window.print();
      });
    });

    return () => {
      batal = true;
    };
  }, [kunci, judul, router]);

  const css = `
@media print {
  @page { size: ${KERTAS.lebar}mm ${KERTAS.tinggi}mm; margin: 0; }
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }

  /* Pembungkus laporan (layout admin, kartu, dll.) dibuat polos */
  *:has(.area-cetak) {
    display: block !important;
    position: static !important;
    left: auto !important;
    width: auto !important;
    max-width: none !important;
    height: auto !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    background: #fff !important;
    overflow: visible !important;
  }

  /* Semua yang bukan laporan (sidebar, judul halaman, kartu) disembunyikan */
  *:has(.area-cetak) > :not(:has(.area-cetak)):not(.area-cetak) { display: none !important; }

  .area-cetak { width: 100% !important; }
  .area-cetak-isi { padding: 0 ${MARGIN_SAMPING}mm !important; }
  .jarak-atas { height: ${MARGIN_ATAS}mm; }
  .jarak-bawah { height: ${MARGIN_BAWAH}mm; }
  .area-cetak-isi tr { break-inside: avoid; }
}`;

  return <style>{css}</style>;
}