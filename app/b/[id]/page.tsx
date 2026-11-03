import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LOGO_KANAN } from "@/components/admin/laporan/KopLaporan";
import { fmtAngka } from "@/lib/format";

// Logo SMK As Salam Gegesik (ganti kalau nama file logo sekolahmu berbeda)
const LOGO = LOGO_KANAN;

export const metadata: Metadata = {
  title: "Barang Inventaris · SMK As Salam Gegesik",
  robots: { index: false, follow: false }, // jangan muncul di Google
};

function Ikon({ d, className = "size-5" }: { d: string[]; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {d.map((p) => (
        <path key={p} d={p} />
      ))}
    </svg>
  );
}

const IKON = {
  centang: ["M20 6 9 17l-5-5"],
  peringatan: ["M12 9v4", "M12 17h.01", "M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"],
};

// Badge "terdaftar resmi"
function BadgeResmi({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      <Ikon d={IKON.centang} className="size-3.5" />
      Barang terdaftar resmi
    </span>
  );
}

export default async function BarangPublikPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [barang, stok] = await Promise.all([
    prisma.barang.findUnique({
      where: { id },
      select: {
        kode: true,
        nama: true,
        merk: true,
        satuan: true,
        tahunPerolehan: true,
        lokasi: { select: { nama: true } },
        kategori: { select: { nama: true } },
      },
    }),
    prisma.barangMasukItem.aggregate({ where: { barangId: id }, _sum: { jumlah: true } }),
  ]);
  if (!barang) notFound();

  // Hanya info yang aman untuk publik (tanpa harga, sumber dana, nota, PJ)
  const info = [
    { label: "Lokasi", nilai: barang.lokasi.nama },
    { label: "Kategori", nilai: barang.kategori.nama },
    { label: "Tahun perolehan", nilai: String(barang.tahunPerolehan) },
    { label: "Jumlah", nilai: `${fmtAngka(stok._sum.jumlah ?? 0)} ${barang.satuan}` },
  ];

  return (
    <main className="min-h-screen bg-green-50 sm:px-4 sm:py-8 lg:grid lg:place-items-center lg:p-10">
      <div className="mx-auto w-full max-w-md lg:max-w-4xl">
        <article className="overflow-hidden bg-white shadow-sm sm:rounded-3xl sm:border sm:border-green-100 lg:grid lg:grid-cols-[2fr_3fr]">
          {/* ===== Identitas sekolah: pita atas di HP, panel kiri di desktop ===== */}
          <header className="flex items-center gap-3 bg-green-900 px-5 py-5 text-white lg:flex-col lg:justify-center lg:gap-5 lg:px-8 lg:py-12 lg:text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="Logo SMK As Salam Gegesik" className="size-12 shrink-0 object-contain lg:size-36" />
            <div>
              <p className="font-bold leading-tight lg:text-2xl">SMK AS SALAM GEGESIK</p>
              <p className="text-sm text-white/70 lg:mt-1">Inventaris Sarana &amp; Prasarana</p>
            </div>
            <BadgeResmi className="hidden bg-white/15 text-white lg:inline-flex" />
          </header>

          {/* ===== Detail barang ===== */}
          <section className="flex flex-col gap-6 p-5 lg:p-10">
            <div>
              <BadgeResmi className="mb-3 bg-green-50 text-green-700 lg:hidden" />
              <p className="font-mono text-sm font-bold tracking-wide text-green-700">{barang.kode}</p>
              <h1 className="mt-1 text-2xl font-bold leading-tight text-gray-900 lg:text-4xl">{barang.nama}</h1>
              {barang.merk && <p className="mt-1 text-gray-500 lg:text-lg">{barang.merk}</p>}
            </div>

            {/* HP: daftar baris (label kiri, nilai kanan). Desktop: kotak 2 x 2 */}
            <dl className="divide-y divide-gray-100 rounded-2xl border border-gray-100 lg:grid lg:grid-cols-2 lg:gap-4 lg:divide-y-0 lg:border-0">
              {info.map((x) => (
                <div
                  key={x.label}
                  className="flex items-center justify-between gap-3 px-4 py-3 lg:flex-col lg:items-start lg:justify-start lg:gap-1 lg:rounded-2xl lg:bg-green-50/70 lg:p-5"
                >
                  <dt className="text-sm text-gray-500 lg:text-xs lg:font-semibold lg:uppercase lg:tracking-wide">{x.label}</dt>
                  <dd className="text-right font-semibold text-gray-900 lg:text-left lg:text-lg">{x.nilai}</dd>
                </div>
              ))}
            </dl>

            {/* Pesan kepemilikan */}
            <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <Ikon d={IKON.peringatan} className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <p>
                Barang ini milik <b>SMK As Salam Gegesik</b>. Jika menemukan barang ini di luar tempatnya atau dalam
                keadaan rusak, silakan lapor ke <b>Tata Usaha</b> atau <b>Waka Sarana &amp; Prasarana</b>.
              </p>
            </div>
          </section>
        </article>

        <p className="py-6 text-center text-xs text-gray-400">SARPRAS · SMK As Salam Gegesik</p>
      </div>
    </main>
  );
}