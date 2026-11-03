"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/admin/Toaster";
import { UKURAN_LABEL } from "./LabelQr";

const KUNCI_CETAK = ["cetak", "cId", "cLokasi", "cKategori"];

// Alamat sekarang tanpa parameter cetak (filter halaman Barang tetap)
function alamatTanpaCetak() {
  const p = new URLSearchParams(window.location.search);
  KUNCI_CETAK.forEach((k) => p.delete(k));
  const s = p.toString();
  return `${window.location.pathname}${s ? `?${s}` : ""}`;
}

// Dipakai tombol cetak: tambah parameter cetak ke URL → server menyiapkan label → print otomatis
export function useCetakLabel() {
  const router = useRouter();
  return (pilihan: { id?: number; lokasiId?: string; kategoriId?: string }) => {
    const p = new URLSearchParams(window.location.search);
    KUNCI_CETAK.forEach((k) => p.delete(k));
    if (pilihan.id) p.set("cId", String(pilihan.id));
    if (pilihan.lokasiId) p.set("cLokasi", pilihan.lokasiId);
    if (pilihan.kategoriId) p.set("cKategori", pilihan.kategoriId);
    p.set("cetak", String(Date.now())); // angka unik supaya bisa cetak berulang kali
    router.push(`/admin/barang?${p}`, { scroll: false });
  };
}

const { lebar, jarak } = UKURAN_LABEL;

const css = `
.lembar-label { display: grid; grid-template-columns: repeat(3, ${lebar}mm); gap: ${jarak}mm; }

@media print {
  @page { size: A4 portrait; margin: 6mm; }
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }

  /* Pembungkus label (layout admin) dibuat polos */
  *:has(.lembar-label) {
    display: block !important; position: static !important; left: auto !important;
    width: auto !important; max-width: none !important; height: auto !important; min-height: 0 !important;
    margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important;
    box-shadow: none !important; background: #fff !important; overflow: visible !important;
  }
  /* Selain lembar label (sidebar, tabel, tombol) disembunyikan */
  *:has(.lembar-label) > :not(:has(.lembar-label)):not(.lembar-label) { display: none !important; }

  .lembar-label { display: grid !important; }
  .label-qr { break-inside: avoid; }
}`;

/**
 * Lembar label yang langsung dicetak lewat jendela print browser.
 * Diletakkan di luar layar (bukan display:none) supaya logo & QR langsung dimuat.
 */
export default function CetakLabel({
  kunci,
  jumlah,
  total,
  children,
}: {
  kunci: string;
  jumlah: number;
  total: number;
  children: ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    let batal = false;
    const selesai = () => router.replace(alamatTanpaCetak(), { scroll: false });

    if (jumlah === 0) {
      toast("Tidak ada barang untuk dicetak", "gagal");
      selesai();
      return;
    }
    if (total > jumlah) toast(`Hanya ${jumlah} dari ${total} label yang dicetak. Persempit pilihan lokasi/kategori.`, "gagal");

    // Tunggu logo selesai digambar (maks 1,5 detik), lalu print
    const gambar = Array.from(document.querySelectorAll<HTMLImageElement>(".lembar-label img")).map((img) =>
      img.decode().catch(() => undefined),
    );
    Promise.race([Promise.all(gambar), new Promise((r) => setTimeout(r, 1500))]).then(() =>
      requestAnimationFrame(() => {
        if (batal) return;
        const judulAsli = document.title;
        document.title = "Label Barang SMK As Salam Gegesik";
        const sesudahPrint = () => {
          window.removeEventListener("afterprint", sesudahPrint);
          document.title = judulAsli;
          selesai();
        };
        window.addEventListener("afterprint", sesudahPrint);
        window.print();
      }),
    );

    return () => {
      batal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunci]);

  return (
    <>
      <style>{css}</style>
      {children}
    </>
  );
}