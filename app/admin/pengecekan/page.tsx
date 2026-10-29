import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rekapKondisi, type RekapKondisi } from "@/lib/stok";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import Pagination from "@/components/admin/Pagination";
import TombolHapus from "@/components/admin/TombolHapus";
import TambahBulanPengecekan from "@/components/admin/pengecekan/TambahBulanPengecekan";
import { PER_HALAMAN, bacaHalaman } from "@/lib/paging";
import { bagianWIB, fmtAngka, fmtBulan, fmtTanggalPendek, kodeBulan, parseBulan } from "@/lib/format";
import { hapusPeriode } from "./actions";

type Cek = {
  tanggal: Date;
  lokasiId: number;
  items: { barangId: number; jumlahAda: number; rusakRingan: number; rusakBerat: number }[];
};

type Bulan = {
  kode: string; // "2026-10"
  periodeId: number | null;
  cek: Cek[]; // semua pengecekan lokasi di bulan ini
};

export default async function PengecekanPage({
  searchParams,
}: {
  searchParams: Promise<{ halaman?: string }>;
}) {
  await requireUser();

  const sp = await searchParams;
  const sekarang = new Date();
  const kodeIni = kodeBulan(sekarang);
  const { y: tahunIni, m: bulanIni } = bagianWIB(sekarang);

  const [periodeList, daftarCek, jumlahLokasi] = await Promise.all([
    prisma.periodePengecekan.findMany({ select: { id: true, bulan: true } }),
    prisma.pengecekan.findMany({
      select: {
        tanggal: true,
        lokasiId: true,
        items: { select: { barangId: true, jumlahAda: true, rusakRingan: true, rusakBerat: true } },
      },
    }),
    // Lokasi yang punya barang = lokasi yang perlu dicek
    prisma.lokasi.count({ where: { barang: { some: {} } } }),
  ]);

  // Kelompokkan per bulan: bulan yang ditambahkan admin + bulan yang sudah berisi pengecekan
  const perBulan = new Map<string, Bulan>();
  const ambil = (kode: string) => {
    const b = perBulan.get(kode) ?? { kode, periodeId: null, cek: [] };
    perBulan.set(kode, b);
    return b;
  };
  for (const p of periodeList) ambil(kodeBulan(p.bulan)).periodeId = p.id;
  for (const c of daftarCek) ambil(kodeBulan(c.tanggal)).cek.push(c);

  const semua = [...perBulan.values()].sort((a, b) => b.kode.localeCompare(a.kode));

  const total = semua.length;
  const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const halaman = Math.min(bacaHalaman(sp.halaman), totalHalaman);
  const tampil = semua.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN);

  // Hitung Baik / Kurang Baik / Rusak Berat / Hilang hanya untuk bulan yang tampil di halaman ini
  const rekapPerBulan = new Map<string, RekapKondisi>();
  for (const b of tampil) rekapPerBulan.set(b.kode, await rekapKondisi(b.cek));

  return (
    <div>
      <PageHeader
        judul="Pengecekan"
        deskripsi="Rekap pengecekan fisik barang setiap bulan. Klik Detail untuk mengecek per lokasi."
        aksi={<TambahBulanPengecekan tahunIni={tahunIni} bulanIni={bulanIni} />}
      />

      {jumlahLokasi === 0 ? (
        <EmptyState judul="Belum ada barang untuk dicek" pesan="Tambahkan lokasi dan barang terlebih dahulu." />
      ) : semua.length === 0 ? (
        <EmptyState
          judul="Belum ada pengecekan"
          pesan="Klik + Tambah Pengecekan, pilih bulan dan tahun, lalu buka Detail untuk mulai mengecek."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-3xl border border-green-100 bg-white shadow-sm">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-green-100 bg-green-50/60 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Bulan</th>
                  <th className="px-5 py-3 font-semibold">Progres</th>
                  <th className="px-4 py-3 text-right font-semibold text-green-700">Baik</th>
                  <th className="px-4 py-3 text-right font-semibold text-amber-700">Kurang Baik</th>
                  <th className="px-4 py-3 text-right font-semibold text-red-700">Rusak Berat</th>
                  <th className="px-4 py-3 text-right font-semibold">Hilang</th>
                  <th className="px-5 py-3 font-semibold">Terakhir Dicek</th>
                  <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tampil.map((b) => {
                  const rekap = rekapPerBulan.get(b.kode)!;
                  const lokasiDicek = new Set(b.cek.map((c) => c.lokasiId)).size;
                  const selesai = Math.min(lokasiDicek, jumlahLokasi);
                  const persen = Math.round((selesai / jumlahLokasi) * 100);
                  const lengkap = selesai >= jumlahLokasi;
                  const terakhir = b.cek.reduce<Date | null>((t, c) => (!t || c.tanggal > t ? c.tanggal : t), null);
                  const namaBulan = fmtBulan(parseBulan(b.kode)!);

                  return (
                    <tr key={b.kode} className="hover:bg-green-50/40">
                      <td className="px-5 py-3">
                        <p className="font-semibold capitalize text-gray-900">{namaBulan}</p>
                        {b.kode === kodeIni && <p className="text-xs font-semibold text-green-700">Bulan berjalan</p>}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`w-14 font-semibold ${lengkap ? "text-green-700" : "text-gray-900"}`}>
                            {selesai} / {jumlahLokasi}
                          </span>
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={`h-full rounded-full ${lengkap ? "bg-green-600" : "bg-amber-500"}`}
                              style={{ width: `${persen}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${rekap.baik ? "text-green-700" : "text-gray-400"}`}>
                        {fmtAngka(rekap.baik)}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${rekap.kurang ? "text-amber-600" : "text-gray-400"}`}>
                        {fmtAngka(rekap.kurang)}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${rekap.rusak ? "text-red-600" : "text-gray-400"}`}>
                        {fmtAngka(rekap.rusak)}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${rekap.hilang ? "text-gray-900" : "text-gray-400"}`}>
                        {fmtAngka(rekap.hilang)}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{terakhir ? fmtTanggalPendek(terakhir) : "–"}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/pengecekan/bulan/${b.kode}`}
                            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-50"
                          >
                            Detail
                          </Link>
                          {/* Hapus dari daftar hanya kalau belum ada lokasi yang dicek */}
                          {b.periodeId && b.cek.length === 0 && (
                            <TombolHapus action={hapusPeriode} id={b.periodeId} nama={`Pengecekan ${namaBulan}`} />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            basePath="/admin/pengecekan"
            params={{}}
            halaman={halaman}
            totalHalaman={totalHalaman}
            total={total}
            perHalaman={PER_HALAMAN}
          />
        </>
      )}
    </div>
  );
}