import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import Pagination from "@/components/admin/Pagination";
import SelectFilter from "@/components/admin/SelectFilter";
import TombolHapus from "@/components/admin/TombolHapus";
import BarangForm from "@/components/admin/barang/BarangForm";
import TombolCetakLabel from "@/components/admin/barang/TombolCetakLabel";
import LihatQr from "@/components/admin/barang/LihatQr";
import CetakLabel from "@/components/admin/barang/CetakLabel";
import LabelQr from "@/components/admin/barang/LabelQr";
import { btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/admin/ui";
import { OPSI_URUT, PER_HALAMAN, bacaHalaman, bacaUrut, orderByNama } from "@/lib/paging";
import { linkBarang, qrSvg } from "@/lib/qr";
import { ambilLabel } from "@/lib/labelBarang";
import { hapusBarang } from "./actions";

type SP = {
  q?: string;
  lokasi?: string;
  kategori?: string;
  urut?: string;
  halaman?: string;
  // Parameter cetak label (diisi tombol Cetak Label / ikon QR)
  cetak?: string;
  cId?: string;
  cLokasi?: string;
  cKategori?: string;
};

export default async function BarangPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();

  // ===== Baca filter dari URL =====
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const lokasiId = Number(sp.lokasi) || 0;
  const kategoriId = Number(sp.kategori) || 0;
  const urut = bacaUrut(sp.urut);
  const adaCari = Boolean(q || lokasiId || kategoriId);
  const adaFilter = adaCari || urut !== "terbaru";

  const where = {
    lokasiId: lokasiId || undefined,
    kategoriId: kategoriId || undefined,
    OR: q
      ? [
          { nama: { contains: q } },
          { kode: { contains: q } },
          { merk: { contains: q } },
          { kategori: { nama: { contains: q } } },
        ]
      : undefined,
  };

  const [lokasiList, kategoriList, satuanRows, merkRows, total] = await Promise.all([
    prisma.lokasi.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
    // Kategori + kodenya (untuk filter, cetak label, dan pratinjau kode barang di form)
    prisma.kategori.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, kode: true, noTerakhir: true },
    }),
    prisma.barang.findMany({
      distinct: ["satuan"],
      select: { satuan: true },
      orderBy: { satuan: "asc" },
    }),
    prisma.barang.findMany({
      where: { merk: { not: null } },
      distinct: ["merk"],
      select: { merk: true },
      orderBy: { merk: "asc" },
    }),
    prisma.barang.count({ where }),
  ]);

  const satuanList = satuanRows.map((s) => s.satuan);
  const merkList = merkRows.map((m) => m.merk).filter((m): m is string => !!m);

  const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const halaman = Math.min(bacaHalaman(sp.halaman), totalHalaman);

  const daftar = await prisma.barang.findMany({
    where,
    include: { lokasi: { select: { nama: true } }, kategori: { select: { nama: true } } },
    orderBy: orderByNama(urut),
    skip: (halaman - 1) * PER_HALAMAN,
    take: PER_HALAMAN,
  });

  // Jumlah tiap barang = total dari semua isi nota barang masuk
  const [totals, qrBaris] = await Promise.all([
    prisma.barangMasukItem.groupBy({
      by: ["barangId"],
      where: { barangId: { in: daftar.map((b) => b.id) } },
      _sum: { jumlah: true },
    }),
    // QR untuk pratinjau di modal tiap baris
    Promise.all(daftar.map(async (b) => [b.id, await qrSvg(linkBarang(b.id))] as const)),
  ]);
  const totalMap = new Map(totals.map((t) => [t.barangId, t._sum.jumlah ?? 0]));
  const qrMap = new Map(qrBaris);

  // ===== Label yang akan dicetak (hanya saat tombol cetak diklik) =====
  const kunciCetak = typeof sp.cetak === "string" ? sp.cetak : "";
  const cetak = kunciCetak
    ? await ambilLabel({
        id: Number(sp.cId) || undefined,
        lokasiId: Number(sp.cLokasi) || undefined,
        kategoriId: Number(sp.cKategori) || undefined,
      })
    : null;

  if (lokasiList.length === 0) {
    return (
      <div>
        <PageHeader judul="Barang" deskripsi="Daftar barang di setiap lokasi." />
        <EmptyState judul="Belum ada lokasi" pesan="Setiap barang harus punya lokasi. Tambahkan lokasi terlebih dahulu.">
          <Link href="/admin/lokasi" className={btnPrimary}>Ke halaman Lokasi</Link>
        </EmptyState>
      </div>
    );
  }

  const opsiForm = { lokasiList, kategoriList, satuanList, merkList };

  // Data untuk form edit & tombol QR (dipakai di kartu HP dan tabel desktop)
  const dataBaris = daftar.map((b) => ({
    b,
    jumlah: totalMap.get(b.id) ?? 0,
    edit: {
      id: b.id,
      kode: b.kode,
      nama: b.nama,
      merk: b.merk,
      kategori: b.kategori.nama,
      tahunPerolehan: b.tahunPerolehan,
      satuan: b.satuan,
      lokasiId: b.lokasiId,
    },
  }));

  return (
    <div className="min-w-0">
      <PageHeader
        judul="Barang"
        deskripsi="Daftar barang di setiap lokasi. Jumlah dihitung dari barang masuk."
        aksi={
          // HP: 2 tombol sama lebar. Desktop: berdampingan seperti semula
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            <TombolCetakLabel lokasiList={lokasiList} kategoriList={kategoriList} />
            <BarangForm {...opsiForm} />
          </div>
        }
      />

      {/* ===== Pencarian & Filter =====
          HP     : kartu dengan judul, kolom tersusun ke bawah + label
          Desktop: satu baris tanpa kartu (seperti semula)
          Tanpa overflow-hidden → dropdown tidak terpotong.
          relative z-20 → dropdown tampil di atas kartu daftar di bawahnya. */}
      <form
        key={`${q}|${lokasiId}|${kategoriId}|${urut}`}
        className="relative z-20 mb-4 rounded-3xl border border-green-100 bg-white shadow-sm md:rounded-none md:border-0 md:bg-transparent md:shadow-none"
      >
        {/* Judul kartu (HP saja). rounded-t-3xl: sudut atas ikut melengkung */}
        <div className="flex items-center gap-2 rounded-t-3xl border-b border-green-100 bg-green-50/60 px-4 py-3 md:hidden">
          <svg viewBox="0 0 24 24" className="size-5 text-green-700" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 4h18l-7 8.5V19l-4 2v-8.5L3 4z" />
          </svg>
          <h2 className="font-semibold text-gray-900">Pencarian &amp; Filter</h2>
        </div>

        <div className="flex flex-col gap-4 p-4 md:flex-row md:flex-wrap md:items-center md:gap-3 md:p-0">
          {/* Cari */}
          <div className="flex flex-col gap-2 md:w-full md:max-w-xs">
            <p className={`${labelClass} md:hidden`}>Cari Barang</p>
            <div className="relative">
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Cari nama, kode, merk, atau kategori..."
                className={`${inputClass} pl-10`}
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
              opsi={[
                { value: "", label: "Semua lokasi" },
                ...lokasiList.map((l) => ({ value: String(l.id), label: l.nama })),
              ]}
              bisaCari
              className="w-full md:w-56"
            />
          </div>

          {/* Kategori */}
          <div className="flex flex-col gap-2">
            <p className={`${labelClass} md:hidden`}>Kategori</p>
            <SelectFilter
              name="kategori"
              label="Filter kategori"
              defaultValue={kategoriId ? String(kategoriId) : ""}
              opsi={[
                { value: "", label: "Semua kategori" },
                ...kategoriList.map((k) => ({ value: String(k.id), label: `${k.nama} (${k.kode})` })),
              ]}
              bisaCari
              className="w-full md:w-56"
            />
          </div>

          {/* Urutkan */}
          <div className="flex flex-col gap-2">
            <p className={`${labelClass} md:hidden`}>Urutkan</p>
            <SelectFilter name="urut" label="Urutkan" defaultValue={urut} opsi={OPSI_URUT} className="w-full md:w-52" />
          </div>

          {/* Tombol: HP lebar penuh, desktop di samping */}
          <div className={`grid gap-2 md:flex md:gap-3 ${adaFilter ? "grid-cols-2" : "grid-cols-1"}`}>
            {/* HP: tombol hijau lebar penuh */}
            <button type="submit" className={`${btnPrimary} justify-center md:hidden`}>
              Terapkan
            </button>
            {/* Desktop: tombol putih (dibungkus supaya benar-benar tersembunyi di HP) */}
            <div className="hidden md:block">
              <button type="submit" className={btnSecondary}>
                Terapkan
              </button>
            </div>
            {adaFilter && (
              <Link href="/admin/barang" className={`${btnSecondary} justify-center`}>
                Reset
              </Link>
            )}
          </div>
        </div>
      </form>

      {daftar.length === 0 ? (
        <EmptyState
          judul={adaCari ? "Barang tidak ditemukan" : "Belum ada barang"}
          pesan={adaCari ? "Coba ubah kata kunci, lokasi, atau kategori." : "Klik Tambah Barang untuk mulai mencatat."}
        />
      ) : (
        <>
          {/* ===== HP: daftar dalam satu kartu ===== */}
          <section className="min-w-0 overflow-hidden rounded-3xl border border-green-100 bg-white shadow-sm md:hidden">
            {/* Judul kartu: jumlah data & halaman */}
            <div className="border-b border-green-100 bg-green-50/60 px-4 py-3">
              <p className="font-semibold text-gray-900">
                Menampilkan {daftar.length} dari {total} barang
              </p>
              <p className="text-xs text-gray-500">
                Halaman {halaman} dari {totalHalaman}
              </p>
            </div>

            <ul className="divide-y divide-gray-100">
              {dataBaris.map(({ b, jumlah, edit }) => (
                <li key={b.id} className="min-w-0 p-4">
                  {/* Ikon + nama + kode */}
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-green-100 text-green-700">
                      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 8l-9-5-9 5 9 5 9-5z" />
                        <path d="M3 8v8l9 5 9-5V8" />
                        <path d="M12 13v8" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-gray-900">{b.nama}</p>
                      <p className="truncate font-mono text-xs text-gray-500">{b.kode}</p>
                    </div>
                  </div>

                  {/* Kotak info */}
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-2xl bg-green-50/60 p-3">
                    <div className="min-w-0">
                      <dt className="text-xs text-gray-500">Kategori</dt>
                      <dd className="truncate text-sm font-semibold text-gray-800">{b.kategori.nama}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-gray-500">Lokasi</dt>
                      <dd className="truncate text-sm font-semibold text-gray-800">{b.lokasi.nama}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-gray-500">Merk</dt>
                      <dd className="truncate text-sm font-semibold text-gray-800">{b.merk ?? "–"}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-gray-500">Jumlah</dt>
                      <dd className="mt-0.5">
                        <span className="inline-block rounded-full border border-green-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-green-700">
                          {jumlah.toLocaleString("id-ID")} {b.satuan}
                        </span>
                      </dd>
                    </div>
                  </dl>

                  {/* Aksi: Edit lebar + QR + Hapus */}
                  <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
                    <BarangForm {...opsiForm} barang={edit} tampilan="kartu" />
                    <div className="grid place-items-center rounded-xl border border-green-200 bg-white px-1">
                      <LihatQr
                        id={b.id}
                        kode={b.kode}
                        nama={b.nama}
                        lokasi={b.lokasi.nama}
                        jumlah={jumlah}
                        satuan={b.satuan}
                        svg={qrMap.get(b.id)!}
                      />
                    </div>
                    <div className="grid place-items-center rounded-xl border border-red-200 bg-red-50 px-1">
                      <TombolHapus action={hapusBarang} id={b.id} nama={b.nama} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* ===== Desktop: tabel seperti semula ===== */}
          <div className="hidden overflow-x-auto rounded-3xl border border-green-100 bg-white shadow-sm md:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-green-100 bg-green-50/60 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">No</th>
                  <th className="px-5 py-3 font-semibold">Kode</th>
                  <th className="px-5 py-3 font-semibold">Nama Barang</th>
                  <th className="px-5 py-3 font-semibold">Merk</th>
                  <th className="px-5 py-3 font-semibold">Kategori</th>
                  <th className="px-5 py-3 font-semibold">Lokasi</th>
                  <th className="px-5 py-3 text-right font-semibold">Jumlah</th>
                  <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dataBaris.map(({ b, jumlah, edit }, i) => (
                  <tr key={b.id} className="hover:bg-green-50/40">
                    <td className="px-5 py-3 text-gray-400">{(halaman - 1) * PER_HALAMAN + i + 1}</td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-gray-500">{b.kode}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900">{b.nama}</td>
                    <td className="px-5 py-3 text-gray-600">{b.merk ?? "–"}</td>
                    <td className="px-5 py-3 text-gray-600">{b.kategori.nama}</td>
                    <td className="px-5 py-3 text-gray-600">{b.lokasi.nama}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <span className="font-semibold text-gray-900">{jumlah.toLocaleString("id-ID")}</span>{" "}
                      <span className="text-gray-500">{b.satuan}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <LihatQr
                          id={b.id}
                          kode={b.kode}
                          nama={b.nama}
                          lokasi={b.lokasi.nama}
                          jumlah={jumlah}
                          satuan={b.satuan}
                          svg={qrMap.get(b.id)!}
                        />
                        <BarangForm {...opsiForm} barang={edit} />
                        <TombolHapus action={hapusBarang} id={b.id} nama={b.nama} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            basePath="/admin/barang"
            params={{
              q: q || undefined,
              lokasi: lokasiId ? String(lokasiId) : undefined,
              kategori: kategoriId ? String(kategoriId) : undefined,
              urut: urut === "terbaru" ? undefined : urut,
            }}
            halaman={halaman}
            totalHalaman={totalHalaman}
            total={total}
            perHalaman={PER_HALAMAN}
          />
        </>
      )}

      {/* ===== Lembar label: di luar layar, hanya muncul saat print ===== */}
      {cetak && (
        <div aria-hidden className="pointer-events-none fixed top-0 left-[-10000px]">
          <CetakLabel kunci={kunciCetak} jumlah={cetak.label.length} total={cetak.total}>
            <div className="lembar-label">
              {cetak.label.map((l) => (
                <LabelQr key={`${l.id}-${l.ke}`} kode={l.kode} svg={cetak.qr[l.id]} ke={l.ke} dari={l.dari} />
              ))}
            </div>
          </CetakLabel>
        </div>
      )}
    </div>
  );
}