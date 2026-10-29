import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { daftarTahunAjaran, resolvePeriode, tahunAjaranAktif } from "@/lib/periode";
import { bagianWIB, rentangTahunKalender } from "@/lib/format";
import PageHeader from "@/components/admin/PageHeader";
import TombolCetak from "@/components/admin/TombolCetak";
import { btnSecondary, inputClass } from "@/components/admin/ui";
import { KopLaporan, TandaTangan } from "@/components/admin/laporan/KopLaporan";
import LaporanInventaris from "@/components/admin/laporan/LaporanInventaris";
import LaporanBarangMasuk from "@/components/admin/laporan/LaporanBarangMasuk";
import LaporanPengecekan from "@/components/admin/laporan/LaporanPengecekan";

const JENIS = [
  { kode: "inventaris", label: "Inventaris per Lokasi" },
  { kode: "barang-masuk", label: "Barang Masuk" },
  { kode: "pengecekan", label: "Rekap Pengecekan" },
] as const;

type JenisKode = (typeof JENIS)[number]["kode"];

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ jenis?: string; periode?: string; lokasi?: string }>;
}) {
  await requireUser();

  const sp = await searchParams;
  const jenis: JenisKode = JENIS.find((j) => j.kode === sp.jenis)?.kode ?? "inventaris";
  const lokasiId = Number(sp.lokasi) || 0;

  const [daftarTA, aktif, lokasiList] = await Promise.all([
    daftarTahunAjaran(),
    tahunAjaranAktif(),
    prisma.lokasi.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
  ]);

  const tahunIni = bagianWIB(new Date()).y;
  const daftarTahun = Array.from({ length: 6 }, (_, i) => tahunIni - i);

  // Periode default: tahun ajaran aktif, kalau belum diatur pakai tahun anggaran berjalan
  const periode =
    (await resolvePeriode(sp.periode ?? (aktif ? `ta-${aktif.id}` : undefined))) ?? {
      kode: `th-${tahunIni}`,
      rentang: rentangTahunKalender(tahunIni),
      label: `Tahun Anggaran ${tahunIni}`,
    };

  const namaLokasi = lokasiList.find((l) => l.id === lokasiId)?.nama;
  const judul = JENIS.find((j) => j.kode === jenis)!.label;

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          judul="Laporan"
          deskripsi="Pilih jenis dan periode laporan, lalu cetak atau simpan sebagai PDF."
          aksi={<TombolCetak />}
        />

        <form className="mb-6 flex flex-wrap gap-3">
          <select name="jenis" defaultValue={jenis} className={`${inputClass} sm:max-w-56`}>
            {JENIS.map((j) => (
              <option key={j.kode} value={j.kode}>{j.label}</option>
            ))}
          </select>

          <select name="periode" defaultValue={periode.kode} className={`${inputClass} sm:max-w-64`}>
            {daftarTA.length > 0 && (
              <optgroup label="Tahun Ajaran">
                {daftarTA.map((ta) => (
                  <option key={ta.id} value={`ta-${ta.id}`}>Tahun Ajaran {ta.nama}</option>
                ))}
              </optgroup>
            )}
            <optgroup label="Tahun Anggaran (Jan–Des)">
              {daftarTahun.map((t) => (
                <option key={t} value={`th-${t}`}>Tahun Anggaran {t}</option>
              ))}
            </optgroup>
          </select>

          <select name="lokasi" defaultValue={lokasiId || ""} className={`${inputClass} sm:max-w-56`}>
            <option value="">Semua lokasi</option>
            {lokasiList.map((l) => (
              <option key={l.id} value={l.id}>{l.nama}</option>
            ))}
          </select>

          <button type="submit" className={btnSecondary}>Tampilkan</button>
        </form>

        {daftarTA.length === 0 && (
          <p className="mb-4 text-sm text-amber-700">
            Tahun ajaran belum diatur. Tambahkan di menu Pengaturan agar bisa memilih laporan per tahun ajaran.
          </p>
        )}
      </div>

      {/* "Kertas" laporan */}
      <div className="rounded-3xl border border-green-100 bg-white p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <KopLaporan judul={`Laporan ${judul}`} periode={periode.label} lokasi={namaLokasi} />

        {jenis === "inventaris" && <LaporanInventaris rentang={periode.rentang} lokasiId={lokasiId} />}
        {jenis === "barang-masuk" && <LaporanBarangMasuk rentang={periode.rentang} lokasiId={lokasiId} />}
        {jenis === "pengecekan" && <LaporanPengecekan rentang={periode.rentang} lokasiId={lokasiId} />}

        <TandaTangan />
      </div>
    </div>
  );
}