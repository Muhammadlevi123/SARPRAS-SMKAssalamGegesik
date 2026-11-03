import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
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
import { btnPrimary, btnSecondary, inputClass } from "@/components/admin/ui";
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
  await requireUser();

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

  return (
    <div>
      <PageHeader
        judul="Barang"
        deskripsi="Daftar barang di setiap lokasi. Jumlah dihitung dari barang masuk."
        aksi={
          <div className="flex flex-wrap items-center gap-2">
            <TombolCetakLabel lokasiList={lokasiList} kategoriList={kategoriList} />
            <BarangForm {...opsiForm} />
          </div>
        }
      />

      {/* ===== Cari & filter ===== */}
      <form key={`${q}|${lokasiId}|${kategoriId}|${urut}`} className="mb-4 flex flex-wrap gap-3">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Cari nama, kode, merk, atau kategori..."
          className={`${inputClass} sm:max-w-xs`}
        />
        <SelectFilter
          name="lokasi"
          label="Filter lokasi"
          defaultValue={lokasiId ? String(lokasiId) : ""}
          opsi={[
            { value: "", label: "Semua lokasi" },
            ...lokasiList.map((l) => ({ value: String(l.id), label: l.nama })),
          ]}
          bisaCari
          className="w-full sm:w-56"
        />
        <SelectFilter
          name="kategori"
          label="Filter kategori"
          defaultValue={kategoriId ? String(kategoriId) : ""}
          opsi={[
            { value: "", label: "Semua kategori" },
            ...kategoriList.map((k) => ({ value: String(k.id), label: `${k.nama} (${k.kode})` })),
          ]}
          bisaCari
          className="w-full sm:w-56"
        />
        <SelectFilter
          name="urut"
          label="Urutkan"
          defaultValue={urut}
          opsi={OPSI_URUT}
          className="w-full sm:w-52"
        />
        <button type="submit" className={btnSecondary}>Terapkan</button>
        {adaFilter && <Link href="/admin/barang" className={btnSecondary}>Reset</Link>}
      </form>

      {daftar.length === 0 ? (
        <EmptyState
          judul={adaCari ? "Barang tidak ditemukan" : "Belum ada barang"}
          pesan={adaCari ? "Coba ubah kata kunci, lokasi, atau kategori." : "Klik Tambah Barang untuk mulai mencatat."}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-3xl border border-green-100 bg-white shadow-sm">
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
                {daftar.map((b, i) => {
                  const jumlah = totalMap.get(b.id) ?? 0;
                  return (
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
                          <BarangForm
                            {...opsiForm}
                            barang={{
                              id: b.id,
                              kode: b.kode,
                              nama: b.nama,
                              merk: b.merk,
                              kategori: b.kategori.nama,
                              tahunPerolehan: b.tahunPerolehan,
                              satuan: b.satuan,
                              lokasiId: b.lokasiId,
                            }}
                          />
                          <TombolHapus action={hapusBarang} id={b.id} nama={b.nama} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
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