import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rekapKondisi, type RekapKondisi } from "@/lib/stok";
import { daftarTahunAjaran, rentangTahunAjaran, tahunAjaranAktif } from "@/lib/periode";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import SelectFilter from "@/components/admin/SelectFilter";
import TombolHapus from "@/components/admin/TombolHapus";
import TombolLihat from "@/components/admin/TombolLihat";
import TambahBulanPengecekan from "@/components/admin/pengecekan/TambahBulanPengecekan";
import { btnPrimary, btnSecondary } from "@/components/admin/ui";
import { fmtAngka, fmtBulan, fmtTanggalPendek, geserBulan, kodeBulan, parseBulan, rentangBulan } from "@/lib/format";
import { hapusPeriode } from "./actions";

// "oktober 2026" → "Oktober 2026"
const hurufBesar = (s: string) => s.replace(/(^|\s)\S/g, (h) => h.toUpperCase());

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

export default async function PengecekanPage({ searchParams }: { searchParams: Promise<{ ta?: string }> }) {
  await requireUser();

  const sp = await searchParams;
  const [daftarTA, aktif] = await Promise.all([daftarTahunAjaran(), tahunAjaranAktif()]);

  // Belum ada tahun ajaran → arahkan ke Kelola Tahun Ajaran
  if (daftarTA.length === 0) {
    return (
      <div>
        <PageHeader judul="Pengecekan" deskripsi="Rekap pengecekan fisik barang setiap bulan." />
        <EmptyState
          judul="Belum ada tahun ajaran"
          pesan="Pengecekan dikelompokkan per tahun ajaran. Tambahkan tahun ajaran terlebih dahulu."
        >
          <Link href="/admin/tahun-ajaran" className={btnPrimary}>Kelola Tahun Ajaran</Link>
        </EmptyState>
      </div>
    );
  }

  // Tahun ajaran terpilih: dari URL (?ta=3) → yang sedang aktif → yang terbaru
  const ta = daftarTA.find((t) => t.id === Number(sp.ta)) ?? aktif ?? daftarTA[0];
  const rentang = await rentangTahunAjaran(ta.id);

  const [periodeList, daftarCek, jumlahLokasi] = await Promise.all([
    // Mulai dari tanggal 1 bulan pertama TA, supaya bulan Juli tetap masuk walau TA mulai tgl 13
    prisma.periodePengecekan.findMany({
      where: { bulan: { gte: rentangBulan(ta.mulai).gte, lt: rentang.lt } },
      select: { id: true, bulan: true },
    }),
    prisma.pengecekan.findMany({
      where: { tanggal: rentang },
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

  // Urut sesuai tahun ajaran: Juli → Juni
  const daftarBulan = [...perBulan.values()].sort((a, b) => a.kode.localeCompare(b.kode));

  // Hitung Baik / Kurang Baik / Rusak Berat / Hilang tiap bulan
  const rekapPerBulan = new Map<string, RekapKondisi>();
  for (const b of daftarBulan) rekapPerBulan.set(b.kode, await rekapKondisi(b.cek));

  // Pilihan bulan untuk "Tambah Pengecekan": semua bulan di tahun ajaran ini yang belum ada di daftar
  const kodeAkhir = kodeBulan(ta.selesai);
  const opsiBulan: { value: string; label: string }[] = [];
  for (let k = kodeBulan(ta.mulai); k <= kodeAkhir; k = geserBulan(k, 1)) {
    if (!perBulan.has(k)) opsiBulan.push({ value: k, label: hurufBesar(fmtBulan(parseBulan(k)!)) });
  }

  const kodeIni = kodeBulan(new Date());
  const bulanAwal = opsiBulan.find((o) => o.value === kodeIni)?.value ?? opsiBulan[0]?.value ?? "";

  return (
    <div>
      <PageHeader
        judul="Pengecekan"
        deskripsi="Rekap pengecekan fisik barang setiap bulan. Klik ikon mata untuk mengecek per lokasi."
        aksi={<TambahBulanPengecekan namaTA={ta.nama} opsi={opsiBulan} bulanAwal={bulanAwal} />}
      />

      {/* Pilih tahun ajaran */}
      <form className="mb-4 flex flex-wrap items-center gap-3">
        <SelectFilter
          name="ta"
          label="Tahun ajaran"
          defaultValue={String(ta.id)}
          opsi={daftarTA.map((t) => ({
            value: String(t.id),
            label: `Tahun Ajaran ${t.nama}${t.id === aktif?.id ? " (aktif)" : ""}`,
          }))}
          className="w-full sm:w-72"
        />
        <button type="submit" className={btnSecondary}>Tampilkan</button>
        <p className="text-sm text-gray-500">
          {fmtTanggalPendek(ta.mulai)} – {fmtTanggalPendek(ta.selesai)}
        </p>
      </form>

      {jumlahLokasi === 0 ? (
        <EmptyState judul="Belum ada barang untuk dicek" pesan="Tambahkan lokasi dan barang terlebih dahulu." />
      ) : daftarBulan.length === 0 ? (
        <EmptyState
          judul={`Belum ada pengecekan di tahun ajaran ${ta.nama}`}
          pesan="Klik + Tambah Pengecekan, pilih bulannya, lalu klik ikon mata untuk mulai mengecek."
        />
      ) : (
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
              {daftarBulan.map((b) => {
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
                        <TombolLihat href={`/admin/pengecekan/bulan/${b.kode}`} judul={`Lihat pengecekan ${namaBulan}`} />
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
      )}
    </div>
  );
}