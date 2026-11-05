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

  // Data siap tampil (dipakai di kartu HP & tabel desktop)
  const dataBulan = daftarBulan.map((b) => {
    const lokasiDicek = new Set(b.cek.map((c) => c.lokasiId)).size;
    const selesai = Math.min(lokasiDicek, jumlahLokasi);
    return {
      b,
      rekap: rekapPerBulan.get(b.kode)!,
      selesai,
      persen: jumlahLokasi ? Math.round((selesai / jumlahLokasi) * 100) : 0,
      lengkap: selesai >= jumlahLokasi,
      terakhir: b.cek.reduce<Date | null>((t, c) => (!t || c.tanggal > t ? c.tanggal : t), null),
      namaBulan: fmtBulan(parseBulan(b.kode)!),
      // Hapus dari daftar hanya kalau belum ada lokasi yang dicek
      bisaHapus: Boolean(b.periodeId && b.cek.length === 0),
    };
  });

  return (
    <div className="min-w-0">
      <PageHeader
        judul="Pengecekan"
        deskripsi="Rekap pengecekan fisik barang setiap bulan. Buka bulan untuk mengecek per lokasi."
        aksi={<TambahBulanPengecekan namaTA={ta.nama} opsi={opsiBulan} bulanAwal={bulanAwal} />}
      />

      {/* Pilih tahun ajaran. HP: pilihan + tombol sejajar, periode di bawahnya */}
      <form className="relative z-20 mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:contents">
          <div className="min-w-0 sm:w-72">
            <SelectFilter
              name="ta"
              label="Tahun ajaran"
              defaultValue={String(ta.id)}
              opsi={daftarTA.map((t) => ({
                value: String(t.id),
                label: `Tahun Ajaran ${t.nama}${t.id === aktif?.id ? " (aktif)" : ""}`,
              }))}
              className="w-full"
            />
          </div>
          <button type="submit" className={`${btnSecondary} justify-center`}>
            Tampilkan
          </button>
        </div>
        <p className="px-1 text-xs text-gray-500 sm:px-0 sm:text-sm">
          {fmtTanggalPendek(ta.mulai)} – {fmtTanggalPendek(ta.selesai)}
        </p>
      </form>

      {jumlahLokasi === 0 ? (
        <EmptyState judul="Belum ada barang untuk dicek" pesan="Tambahkan lokasi dan barang terlebih dahulu." />
      ) : daftarBulan.length === 0 ? (
        <EmptyState
          judul={`Belum ada pengecekan di tahun ajaran ${ta.nama}`}
          pesan="Klik + Tambah Pengecekan, pilih bulannya, lalu buka untuk mulai mengecek."
        />
      ) : (
        <>
          {/* ===== HP: kartu per bulan ===== */}
          <section className="min-w-0 overflow-hidden rounded-3xl border border-green-100 bg-white shadow-sm md:hidden">
            <div className="border-b border-green-100 bg-green-50/60 px-4 py-3">
              <p className="font-semibold text-gray-900">{daftarBulan.length} bulan pengecekan</p>
              <p className="text-xs text-gray-500">Tahun Ajaran {ta.nama}</p>
            </div>

            <ul className="divide-y divide-gray-100">
              {dataBulan.map(({ b, rekap, selesai, persen, lengkap, terakhir, namaBulan, bisaHapus }) => (
                <li key={b.kode} className="min-w-0 p-4">
                  {/* Bulan + tanggal terakhir dicek */}
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-green-100 text-green-700">
                      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                        <path d="M4 10h16" />
                        <path d="M8 3v4" />
                        <path d="M16 3v4" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                        <p className="truncate text-base font-bold capitalize text-gray-900">{namaBulan}</p>
                        {b.kode === kodeIni && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                            Bulan berjalan
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Terakhir dicek: {terakhir ? fmtTanggalPendek(terakhir) : "–"}
                      </p>
                    </div>
                  </div>

                  {/* Progres lokasi */}
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-gray-500">Lokasi dicek</span>
                      <b className={lengkap ? "text-green-700" : "text-gray-900"}>
                        {selesai} / {jumlahLokasi}
                      </b>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${lengkap ? "bg-green-600" : "bg-amber-500"}`}
                        style={{ width: `${persen}%` }}
                      />
                    </div>
                  </div>

                  {/* Kondisi */}
                  <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: "Baik", nilai: rekap.baik, cls: "bg-green-50 text-green-700" },
                      { label: "Kurang", nilai: rekap.kurang, cls: "bg-amber-50 text-amber-700" },
                      { label: "Rusak", nilai: rekap.rusak, cls: "bg-red-50 text-red-700" },
                      { label: "Hilang", nilai: rekap.hilang, cls: "bg-gray-100 text-gray-700" },
                    ].map((k) => (
                      <div key={k.label} className={`min-w-0 rounded-xl px-1 py-2 ${k.cls}`}>
                        <dd className="truncate text-base font-bold">{fmtAngka(k.nilai)}</dd>
                        <dt className="text-[10px] font-semibold">{k.label}</dt>
                      </div>
                    ))}
                  </dl>

                  {/* Aksi */}
                  <div className={`mt-3 grid gap-2 ${bisaHapus ? "grid-cols-[1fr_auto]" : "grid-cols-1"}`}>
                    <Link
                      href={`/admin/pengecekan/bulan/${b.kode}`}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 text-sm font-semibold text-green-700 active:bg-green-100"
                    >
                      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      Buka Pengecekan
                    </Link>
                    {bisaHapus && (
                      <div className="grid place-items-center rounded-xl border border-red-200 bg-red-50 px-1">
                        <TombolHapus action={hapusPeriode} id={b.periodeId!} nama={`Pengecekan ${namaBulan}`} />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* ===== Desktop: tabel seperti semula ===== */}
          <div className="hidden overflow-x-auto rounded-3xl border border-green-100 bg-white shadow-sm md:block">
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
                {dataBulan.map(({ b, rekap, selesai, persen, lengkap, terakhir, namaBulan, bisaHapus }) => (
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
                        {bisaHapus && (
                          <TombolHapus action={hapusPeriode} id={b.periodeId!} nama={`Pengecekan ${namaBulan}`} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}