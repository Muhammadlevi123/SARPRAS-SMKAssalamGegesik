import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import Pagination from "@/components/admin/Pagination";
import SelectFilter from "@/components/admin/SelectFilter";
import TombolHapus from "@/components/admin/TombolHapus";
import { btnPrimary, btnSecondary, inputClass } from "@/components/admin/ui";
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

  return (
    <div>
      <PageHeader
        judul="Barang Masuk"
        deskripsi="Riwayat nota pembelian, MOU, bantuan, dan pencatatan barang lama."
        aksi={<Link href="/admin/barang-masuk/tambah" className={btnPrimary}>+ Catat Barang Masuk</Link>}
      />

      <form key={`${q}|${tahun}|${sumber}|${lokasiId}`} className="mb-4 flex flex-wrap gap-3">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Cari no. nota, keterangan, atau nama barang..."
          className={`${inputClass} sm:max-w-xs`}
        />
        <SelectFilter
          name="tahun"
          label="Filter tahun"
          defaultValue={tahun ? String(tahun) : ""}
          opsi={[{ value: "", label: "Semua tahun" }, ...daftarTahun.map((t) => ({ value: String(t), label: String(t) }))]}
          className="w-full sm:w-40"
        />
        <SelectFilter
          name="sumber"
          label="Filter sumber"
          defaultValue={sumber ?? ""}
          opsi={[{ value: "", label: "Semua sumber" }, ...DAFTAR_SUMBER.map((s) => ({ value: s, label: SUMBER_LABEL[s] }))]}
          className="w-full sm:w-48"
        />
        <SelectFilter
          name="lokasi"
          label="Filter lokasi"
          defaultValue={lokasiId ? String(lokasiId) : ""}
          opsi={[{ value: "", label: "Semua lokasi" }, ...lokasiList.map((l) => ({ value: String(l.id), label: l.nama }))]}
          bisaCari
          className="w-full sm:w-52"
        />
        <button type="submit" className={btnSecondary}>Terapkan</button>
        {adaFilter && <Link href="/admin/barang-masuk" className={btnSecondary}>Reset</Link>}
      </form>

      {daftar.length === 0 ? (
        <EmptyState
          judul={adaFilter ? "Tidak ada data untuk filter ini" : "Belum ada barang masuk"}
          pesan={adaFilter ? "Coba ubah kata kunci atau filter." : "Klik Catat Barang Masuk untuk mulai."}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-3xl border border-green-100 bg-white shadow-sm">
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
                {daftar.map((n) => {
                  // Total = harga barang + biaya lain-lain (ongkir, diskon, dll.)
                  const nilai =
                    n.items.reduce((t, it) => t + (it.harga ?? 0) * it.jumlah, 0) +
                    totalBiayaLain(bacaBiayaLain(n.biayaLain));
                  const nama = n.items.map((it) => it.barang.nama);
                  return (
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
                            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 5h16v14H4z" />
                              <path d="M4 15l4-4 4 4 3-3 5 5" />
                            </svg>
                          </a>
                        ) : (
                          <span className="text-gray-300">–</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/barang-masuk/${n.id}`}
                            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-50"
                          >
                            Detail
                          </Link>
                          <TombolHapus
                            action={hapusBarangMasuk}
                            id={n.id}
                            nama={`Nota ${n.noNota ?? fmtTanggalPendek(n.tanggal)}`}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
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