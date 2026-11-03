import type { ReactNode } from "react";
import { preload } from "react-dom";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { daftarTahunAjaran, tahunAjaranAktif } from "@/lib/periode";
import { bacaFilter, type FilterLaporan } from "@/lib/laporan/filter";
import { dataBarangMasuk, dataInventaris, dataPengecekan } from "@/lib/laporan/data";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import PilihLaporan from "@/components/admin/laporan/PilihLaporan";
import PengaturanKertas from "@/components/admin/laporan/PengaturanKertas";
import AreaCetak from "@/components/admin/laporan/AreaCetak";
import { KopLaporan, TandaTangan, LOGO_KIRI, LOGO_KANAN } from "@/components/admin/laporan/KopLaporan";
import TabelInventaris from "@/components/admin/laporan/TabelInventaris";
import TabelBarangMasuk from "@/components/admin/laporan/TabelBarangMasuk";
import TabelPengecekan from "@/components/admin/laporan/TabelPengecekan";
import { btnPrimary } from "@/components/admin/ui";
import { fmtBulan, kodeBulan, rentangBulan } from "@/lib/format";

const SEHARI = 24 * 60 * 60 * 1000;
const hurufBesar = (s: string) => s.replace(/(^|\s)\S/g, (h) => h.toUpperCase());

type SP = Record<string, string | string[] | undefined>;
const semua = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

// Salin parameter URL; kalau "bulan" diisi, ganti bulan dengan satu bulan itu saja ("" = tanpa bulan)
function salinParam(sp: SP, bulan?: string) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) for (const x of semua(v)) p.append(k, x);
  if (bulan !== undefined) {
    p.delete("bulan");
    if (bulan) p.append("bulan", bulan);
  }
  return p;
}

// Tabel sesuai jenis laporan
async function tabelLaporan(f: FilterLaporan): Promise<ReactNode> {
  const satuLokasi = !f.semuaLokasi && f.lokasi.length === 1;
  if (f.jenis === "inventaris") return <TabelInventaris data={await dataInventaris(f)} satuLokasi={satuLokasi} />;
  if (f.jenis === "barang-masuk") return <TabelBarangMasuk data={await dataBarangMasuk(f)} satuLokasi={satuLokasi} />;
  return <TabelPengecekan data={await dataPengecekan(f)} satuLokasi={satuLokasi} />;
}

export default async function LaporanPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser();
  const sp = await searchParams;

  // Logo kop dimuat duluan saat halaman dibuka → saat Cetak sudah ada di cache
  preload(LOGO_KIRI, { as: "image" });
  preload(LOGO_KANAN, { as: "image" });

  const [daftarTA, aktif, periode, lokasi] = await Promise.all([
    daftarTahunAjaran(),
    tahunAjaranAktif(),
    prisma.periodePengecekan.findMany({ orderBy: { bulan: "asc" }, select: { bulan: true } }),
    prisma.lokasi.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
  ]);

  if (daftarTA.length === 0) {
    return (
      <div>
        <PageHeader judul="Laporan" deskripsi="Export laporan ke Excel, atau cetak / simpan sebagai PDF." />
        <EmptyState judul="Belum ada tahun ajaran" pesan="Laporan disusun per tahun ajaran. Tambahkan tahun ajaran terlebih dahulu.">
          <Link href="/admin/tahun-ajaran" className={btnPrimary}>Kelola Tahun Ajaran</Link>
        </EmptyState>
      </div>
    );
  }

  // Tahun ajaran + bulan-bulan yang sudah ditambahkan di dalamnya
  const opsiTA = daftarTA.map((ta) => {
    const akhir = ta.selesai.getTime() + SEHARI;
    return {
      id: ta.id,
      nama: ta.nama,
      aktif: ta.id === aktif?.id,
      bulan: periode
        // bulan yang bersinggungan dengan tahun ajaran (Juli tetap masuk walau TA mulai tgl 13)
        .filter((p) => p.bulan.getTime() < akhir && rentangBulan(p.bulan).lt > ta.mulai)
        .map((p) => ({ kode: kodeBulan(p.bulan), label: hurufBesar(fmtBulan(p.bulan)) })),
    };
  });

  // ===== Laporan untuk dicetak (hanya kalau tombol Cetak / PDF diklik) =====
  const kunciCetak = typeof sp.cetak === "string" ? sp.cetak : "";
  const lembar: { kunci: string; f: FilterLaporan; isi: ReactNode }[] = [];
  let namaFile = "Laporan";

  if (kunciCetak) {
    const ta = opsiTA.find((t) => String(t.id) === sp.ta);

    if (sp.perBulan === "1" && ta && ta.bulan.length > 0) {
      // Pisah per bulan: satu lembar per bulan, tiap bulan mulai di halaman baru
      const dipilih = semua(sp.bulan);
      const kodeTerpilih = ta.bulan.map((b) => b.kode).filter((k) => dipilih.length === 0 || dipilih.includes(k));

      for (const k of kodeTerpilih) {
        const f = await bacaFilter(salinParam(sp, k));
        if (f) lembar.push({ kunci: k, f, isi: await tabelLaporan(f) });
      }

      const dasar = await bacaFilter(salinParam(sp, ""));
      if (dasar) namaFile = `${dasar.namaFile} - Per Bulan`;
    } else {
      const f = await bacaFilter(sp);
      if (f) {
        lembar.push({ kunci: "satu", f, isi: await tabelLaporan(f) });
        namaFile = f.namaFile;
      }
    }
  }

  return (
    <div>
      <div className="print:hidden">
        <PageHeader judul="Laporan" deskripsi="Pilih jenis laporan, centang data yang ingin dimasukkan, lalu export." />
        <PilihLaporan tahunAjaran={opsiTA} taAwal={aktif?.id ?? daftarTA[0].id} lokasi={lokasi} />
      </div>

      {/* Digeser ke luar layar (bukan display:none) supaya logo & isi langsung dimuat browser.
          Saat print, posisinya kembali normal. */}
      {lembar.length > 0 && (
        <div aria-hidden className="pointer-events-none fixed top-0 left-[-10000px] w-[200mm] print:static print:w-auto">
          <PengaturanKertas judul={namaFile} kunci={kunciCetak} />

          {lembar.map((l, i) => (
            <div key={l.kunci} style={i > 0 ? { breakBefore: "page" } : undefined}>
              <AreaCetak>
                <KopLaporan />

                <div className="mb-5 text-center text-black">
                  <p className="text-[12pt] font-bold uppercase underline underline-offset-4">Laporan {l.f.judul}</p>
                  {l.f.subjudul.map((s) => (
                    <p key={s} className="mt-1 text-[10pt]">{s}</p>
                  ))}
                </div>

                {l.isi}

                <TandaTangan />
              </AreaCetak>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}