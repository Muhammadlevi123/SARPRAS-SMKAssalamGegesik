import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import Pagination from "@/components/admin/Pagination";
import SelectFilter from "@/components/admin/SelectFilter";
import TombolHapus from "@/components/admin/TombolHapus";
import TombolLihat from "@/components/admin/TombolLihat";
import { btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/admin/ui";
import { PER_HALAMAN, bacaHalaman } from "@/lib/paging";
import {
  DAFTAR_SUMBER,
  SUMBER_LABEL,
  bacaBiayaLain,
  bagianWIB,
  fmtRupiah,
  fmtTanggalPendek,
  isSumber,
  rentangTahunKalender,
  totalBiayaLain,
  type SumberKode,
} from "@/lib/format";
import { hapusBarangMasuk } from "./actions";

const WARNA_SUMBER: Record<SumberKode, string> = {
  PEMBELIAN: "bg-blue-50 text-blue-700",
  MOU: "bg-purple-50 text-purple-700",
  BANTUAN: "bg-amber-50 text-amber-700",
  LAMA: "bg-gray-100 text-gray-600",
};

// Ikon foto (dipakai di kartu HP & tabel desktop)
const IkonFoto = () => (
  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5h16v14H4z" />
    <path d="M4 15l4-4 4 4 3-3 5 5" />
  </svg>
);

export default async function BarangMasukPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tahun?: string; sumber?: string; lokasi?: string; halaman?: string }>;
}) {
  await requireUser();

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const tahun = Number(sp.tahun) || 0;
  const sumber = sp.sumber && isSumber(sp.sumber) ? sp.sumber : undefined;
  const lokasiId = Number(sp.lokasi) || 0;
  const adaFilter = Boolean(q || tahun || sumber || lokasiId);

  const tahunIni = bagianWIB(new Date()).y;
  const daftarTahun = Array.from({ length: 6 }, (_, i) => tahunIni - i);

  const where = {
    tanggal: tahun ? rentangTahunKalender(tahun) : undefined,
    sumber,
    items: lokasiId ? { some: { barang: { lokasiId } } } : undefined,
    OR: q
      ? [
          { noNota: { contains: q } },
          { keterangan: { contains: q } },
          { items: { some: { barang: { nama: { contains: q } } } } },
        ]
      : undefined,
  };

  const [lokasiList, total] = await Promise.all([
    prisma.lokasi.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
    prisma.barangMasuk.count({ where }),
  ]);

  const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const halaman = Math.min(bacaHalaman(sp.halaman), totalHalaman);

  const daftar = await prisma.barangMasuk.findMany({
    where,
    include: {
      mitra: { select: { nama: true } },
      items: { select: { jumlah: true, harga: true, barang: { select: { nama: true } } }, orderBy: { id: "asc" } },
    },
    orderBy: [{ tanggal: "desc" }, { id: "desc" }],
    skip: (halaman - 1) * PER_HALAMAN,
    take: PER_HALAMAN,
  });

  // Data siap tampil (dipakai di kartu HP & tabel desktop)
  const dataNota = daftar.map((n) => {
    // Total = harga barang + biaya lain-lain (ongkir, diskon, dll.)
    const nilai =
      n.items.reduce((t, it) => t + (it.harga ?? 0) * it.jumlah, 0) + totalBiayaLain(bacaBiayaLain(n.biayaLain));
    const nama = n.items.map((it) => it.barang.nama);
    return {
      n,
      nilai,
      nama,
      label: `Nota ${n.noNota ?? fmtTanggalPendek(n.tanggal)}`,
      ringkas: nama.slice(0, 2).join(", ") + (nama.length > 2 ? ` +${nama.length - 2}` : ""),
    };
  });

  return (
    <div className="min-w-0">
      <PageHeader
        judul="Barang Masuk"
        deskripsi="Riwayat nota pembelian, MOU, bantuan, dan pencatatan barang lama."
        aksi={
          <Link href="/admin/barang-masuk/tambah" className={`${btnPrimary} justify-center`}>
            + Catat Barang Masuk
          </Link>
        }
      />

      {/* ===== Pencarian & Filter =====
          HP     : kartu dengan judul, kolom tersusun ke bawah + label
          Desktop: satu baris tanpa kartu (seperti semula)
          relative z-20 & tanpa overflow-hidden → dropdown tidak terpotong */}
      <form
        key={`${q}|${tahun}|${sumber}|${lokasiId}`}
        className="relative z-20 mb-4 rounded-3xl border border-green-100 bg-white shadow-sm md:rounded-none md:border-0 md:bg-transparent md:shadow-none"
      >
        {/* Judul kartu (HP saja) */}
        <div className="flex items-center gap-2 rounded-t-3xl border-b border-green-100 bg-green-50/60 px-4 py-3 md:hidden">
          <svg viewBox="0 0 24 24" className="size-5 text-green-700" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 4h18l-7 8.5V19l-4 2v-8.5L3 4z" />
          </svg>
          <h2 className="font-semibold text-gray-900">Pencarian &amp; Filter</h2>
        </div>

        <div className="flex flex-col gap-4 p-4 md:flex-row md:flex-wrap md:items-center md:gap-3 md:p-0">
          {/* Cari */}
          <div className="flex flex-col gap-2 md:w-full md:max-w-xs">
            <p className={`${labelClass} md:hidden`}>Cari Nota</p>
            <div className="relative">
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Cari no. nota, keterangan, atau nama barang..."
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>

          {/* HP: Tahun & Sumber berdampingan (isinya pendek) */}
          <div className="grid grid-cols-2 gap-3 md:contents">
            <div className="flex min-w-0 flex-col gap-2">
              <p className={`${labelClass} md:hidden`}>Tahun</p>
              <SelectFilter
                name="tahun"
                label="Filter tahun"
                defaultValue={tahun ? String(tahun) : ""}
                opsi={[{ value: "", label: "Semua tahun" }, ...daftarTahun.map((t) => ({ value: String(t), label: String(t) }))]}
                className="w-full md:w-40"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <p className={`${labelClass} md:hidden`}>Sumber</p>
              <SelectFilter
                name="sumber"
                label="Filter sumber"
                defaultValue={sumber ?? ""}
                opsi={[{ value: "", label: "Semua sumber" }, ...DAFTAR_SUMBER.map((s) => ({ value: s, label: SUMBER_LABEL[s] }))]}
                className="w-full md:w-48"
              />
            </div>
          </div>

          {/* Lokasi */}
          <div className="flex flex-col gap-2">
            <p className={`${labelClass} md:hidden`}>Lokasi</p>
            <SelectFilter
              name="lokasi"
              label="Filter lokasi"
              defaultValue={lokasiId ? String(lokasiId) : ""}
              opsi={[{ value: "", label: "Semua lokasi" }, ...lokasiList.map((l) => ({ value: String(l.id), label: l.nama }))]}
              bisaCari
              className="w-full md:w-52"
            />
          </div>

          {/* Tombol: HP lebar penuh, desktop di samping */}
          <div className={`grid gap-2 md:flex md:gap-3 ${adaFilter ? "grid-cols-2" : "grid-cols-1"}`}>
            <button type="submit" className={`${btnPrimary} justify-center md:hidden`}>
              Terapkan
            </button>
            <div className="hidden md:block">
              <button type="submit" className={btnSecondary}>
                Terapkan
              </button>
            </div>
            {adaFilter && (
              <Link href="/admin/barang-masuk" className={`${btnSecondary} justify-center`}>
                Reset
              </Link>
            )}
          </div>
        </div>
      </form>

      {daftar.length === 0 ? (
        <EmptyState
          judul={adaFilter ? "Tidak ada data untuk filter ini" : "Belum ada barang masuk"}
          pesan={adaFilter ? "Coba ubah kata kunci atau filter." : "Klik Catat Barang Masuk untuk mulai."}
        />
      ) : (
        <>
          {/* ===== HP: daftar nota dalam satu kartu ===== */}
          <section className="min-w-0 overflow-hidden rounded-3xl border border-green-100 bg-white shadow-sm md:hidden">
            <div className="border-b border-green-100 bg-green-50/60 px-4 py-3">
              <p className="font-semibold text-gray-900">
                Menampilkan {daftar.length} dari {total} nota
              </p>
              <p className="text-xs text-gray-500">
                Halaman {halaman} dari {totalHalaman}
              </p>
            </div>

            <ul className="divide-y divide-gray-100">
              {dataNota.map(({ n, nilai, nama, label, ringkas }) => (
                <li key={n.id} className="min-w-0 p-4">
                  {/* Ikon + isi nota + tanggal */}
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-green-100 text-green-700">
                      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3v12" />
                        <path d="M7 10l5 5 5-5" />
                        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-base font-bold text-gray-900">{ringkas}</p>
                        <span className="shrink-0 pt-0.5 text-xs text-gray-500">{fmtTanggalPendek(n.tanggal)}</span>
                      </div>
                      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${WARNA_SUMBER[n.sumber]}`}>
                          {SUMBER_LABEL[n.sumber]}
                        </span>
                        {n.mitra && <span className="min-w-0 truncate text-xs text-gray-500">{n.mitra.nama}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Kotak info */}
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-2xl bg-green-50/60 p-3">
                    <div className="min-w-0">
                      <dt className="text-xs text-gray-500">No. Nota</dt>
                      <dd className="truncate font-mono text-sm font-semibold text-gray-800">{n.noNota ?? "–"}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-gray-500">Total</dt>
                      <dd className="truncate text-sm font-semibold text-gray-800">
                        {n.sumber === "PEMBELIAN" ? fmtRupiah(nilai) : "–"}
                      </dd>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <dt className="text-xs text-gray-500">Isi</dt>
                      <dd className="mt-0.5">
                        <span className="inline-block rounded-full border border-green-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-green-700">
                          {nama.length} barang
                        </span>
                      </dd>
                    </div>
                  </dl>

                  {/* Aksi: Lihat Detail lebar + Foto (jika ada) + Hapus */}
                  <div className={`mt-3 grid gap-2 ${n.foto ? "grid-cols-[1fr_auto_auto]" : "grid-cols-[1fr_auto]"}`}>
                    <Link
                      href={`/admin/barang-masuk/${n.id}`}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 text-sm font-semibold text-green-700 active:bg-green-100"
                    >
                      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      Lihat Detail
                    </Link>
                    {n.foto && (
                      <a
                        href={`/api/foto-nota/${n.foto}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Lihat foto nota"
                        className="grid size-11 place-items-center rounded-xl border border-green-200 bg-white text-green-700 active:bg-green-50"
                      >
                        <IkonFoto />
                      </a>
                    )}
                    <div className="grid place-items-center rounded-xl border border-red-200 bg-red-50 px-1">
                      <TombolHapus action={hapusBarangMasuk} id={n.id} nama={label} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* ===== Desktop: tabel seperti semula ===== */}
          <div className="hidden overflow-x-auto rounded-3xl border border-green-100 bg-white shadow-sm md:block">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-green-100 bg-green-50/60 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Tanggal</th>
                  <th className="px-5 py-3 font-semibold">No. Nota</th>
                  <th className="px-5 py-3 font-semibold">Sumber</th>
                  <th className="px-5 py-3 font-semibold">Isi</th>
                  <th className="px-5 py-3 text-right font-semibold">Total</th>
                  <th className="px-5 py-3 text-center font-semibold">Foto</th>
                  <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dataNota.map(({ n, nilai, nama, label }) => (
                  <tr key={n.id} className="hover:bg-green-50/40">
                    <td className="whitespace-nowrap px-5 py-3 text-gray-600">{fmtTanggalPendek(n.tanggal)}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{n.noNota ?? "–"}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${WARNA_SUMBER[n.sumber]}`}>
                        {SUMBER_LABEL[n.sumber]}
                      </span>
                      {n.mitra && <p className="mt-1 text-xs text-gray-500">{n.mitra.nama}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-gray-900">{nama.slice(0, 2).join(", ")}</p>
                      <p className="text-xs text-gray-500">
                        {n.items.length} barang{nama.length > 2 ? ` · +${nama.length - 2} lainnya` : ""}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-gray-900">
                      {n.sumber === "PEMBELIAN" ? fmtRupiah(nilai) : "–"}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {n.foto ? (
                        <a
                          href={`/api/foto-nota/${n.foto}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Lihat foto nota"
                          className="inline-grid size-8 place-items-center rounded-lg text-green-700 hover:bg-green-50"
                        >
                          <IkonFoto />
                        </a>
                      ) : (
                        <span className="text-gray-300">–</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <TombolLihat href={`/admin/barang-masuk/${n.id}`} judul={`Lihat ${label}`} />
                        <TombolHapus action={hapusBarangMasuk} id={n.id} nama={label} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            basePath="/admin/barang-masuk"
            params={{
              q: q || undefined,
              tahun: tahun ? String(tahun) : undefined,
              sumber,
              lokasi: lokasiId ? String(lokasiId) : undefined,
            }}
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