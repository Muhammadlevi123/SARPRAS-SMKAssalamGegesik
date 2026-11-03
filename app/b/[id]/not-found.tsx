import { LOGO_KANAN } from "@/components/admin/laporan/KopLaporan";

// Tampil kalau QR berisi ID barang yang sudah dihapus / link salah
export default function BarangTidakDitemukan() {
  return (
    <main className="grid min-h-screen place-items-center bg-green-50 p-6">
      <div className="w-full max-w-sm rounded-3xl border border-green-100 bg-white p-8 text-center shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_KANAN} alt="Logo SMK As Salam Gegesik" className="mx-auto size-20 object-contain" />
        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-green-700">SMK As Salam Gegesik</p>
        <h1 className="mt-2 text-xl font-bold text-gray-900">Barang tidak ditemukan</h1>
        <p className="mt-2 text-sm text-gray-500">
          Barang ini mungkin sudah tidak terdaftar. Silakan hubungi Tata Usaha atau Waka Sarana &amp; Prasarana.
        </p>
      </div>
    </main>
  );
}