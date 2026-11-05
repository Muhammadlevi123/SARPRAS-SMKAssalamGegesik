import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import PageHeader from "@/components/admin/PageHeader";
import TombolHapus from "@/components/admin/TombolHapus";
import { btnSecondary } from "@/components/admin/ui";
import {
  SUMBER_LABEL,
  bacaBiayaLain,
  fmtAngka,
  fmtRupiah,
  fmtTanggal,
  totalBiayaLain,
} from "@/lib/format";
import { hapusBarangMasukDariDetail } from "../actions";

// Rp dengan tanda minus untuk potongan
const fmtBertanda = (n: number) => (n < 0 ? `−${fmtRupiah(-n)}` : fmtRupiah(n));

export default async function DetailBarangMasukPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const nota = await prisma.barangMasuk.findUnique({
    where: { id },
    include: {
      mitra: { select: { nama: true } },
      items: {
        include: { barang: { select: { nama: true, kode: true, merk: true, satuan: true } } },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!nota) notFound();

  const pembelian = nota.sumber === "PEMBELIAN";
  const biaya = bacaBiayaLain(nota.biayaLain);
  const subtotalBarang = nota.items.reduce((t, it) => t + (it.harga ?? 0) * it.jumlah, 0);
  const totalBayar = subtotalBarang + totalBiayaLain(biaya);
  const judul = nota.noNota ? `Nota ${nota.noNota}` : "Detail Barang Masuk";

  // lebar: "penuh" → di HP memakai 2 kolom (teks panjang seperti keterangan)
  const info: { label: string; nilai: string; penuh?: boolean }[] = [
    { label: "Tanggal", nilai: fmtTanggal(nota.tanggal) },
    { label: "Sumber", nilai: SUMBER_LABEL[nota.sumber] },
    { label: pembelian ? "No. Nota" : "No. Dokumen", nilai: nota.noNota ?? "–" },
    ...(nota.mitra ? [{ label: "Mitra", nilai: nota.mitra.nama }] : []),
    ...(pembelian ? [{ label: "Total pembayaran", nilai: fmtRupiah(totalBayar) }] : []),
    { label: "Keterangan", nilai: nota.keterangan ?? "–", penuh: true },
  ];

  return (
    <div className="min-w-0">
      <PageHeader
        judul={judul}
        deskripsi={`${nota.items.length} barang`}
        aksi={
          // HP: Kembali lebar + Hapus. Desktop: berdampingan seperti semula
          <div className="grid w-full grid-cols-[1fr_auto] items-center gap-2 sm:flex sm:w-auto">
            <Link href="/admin/barang-masuk" className={`${btnSecondary} justify-center`}>
              ← Kembali
            </Link>
            <div className="grid place-items-center rounded-xl border border-red-200 bg-red-50 px-1 sm:border-0 sm:bg-transparent sm:px-0">
              <TombolHapus action={hapusBarangMasukDariDetail} id={nota.id} nama={judul} />
            </div>
          </div>
        }
      />

      <div className={`grid gap-4 sm:gap-6 ${pembelian ? "lg:grid-cols-3" : ""}`}>
        <div className={`flex min-w-0 flex-col gap-4 sm:gap-6 ${pembelian ? "lg:col-span-2" : ""}`}>
          {/* Info nota: HP 2 kolom (keterangan lebar penuh) */}
          <section className="rounded-3xl border border-green-100 bg-white p-4 shadow-sm sm:p-5">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:gap-4">
              {info.map((x) => (
                <div key={x.label} className={`min-w-0 ${x.penuh ? "col-span-2" : ""}`}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{x.label}</dt>
                  <dd className="mt-0.5 break-words font-semibold text-gray-900">{x.nilai}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Isi nota + rincian biaya */}
          <div className="min-w-0 overflow-hidden rounded-3xl border border-green-100 bg-white shadow-sm">
            {/* Judul isi (HP saja) */}
            <div className="border-b border-green-100 bg-green-50/60 px-4 py-3 md:hidden">
              <p className="font-semibold text-gray-900">Isi Nota</p>
              <p className="text-xs text-gray-500">{nota.items.length} barang</p>
            </div>

            {/* ===== HP: kartu per barang ===== */}
            <ul className="divide-y divide-gray-100 md:hidden">
              {nota.items.map((it, i) => (
                <li key={it.id} className="min-w-0 px-4 py-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-green-100 text-xs font-bold text-green-700">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold text-gray-900">{it.barang.nama}</p>
                      {(it.barang.merk || it.barang.kode) && (
                        <p className="truncate text-xs text-gray-500">
                          {[it.barang.merk, it.barang.kode].filter(Boolean).join(" · ")}
                        </p>
                      )}

                      {/* Jumlah (× harga = subtotal untuk pembelian) */}
                      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
                        <span className="text-gray-600">
                          <b className="text-gray-900">{fmtAngka(it.jumlah)}</b> {it.barang.satuan}
                          {pembelian && <> × {fmtRupiah(it.harga ?? 0)}</>}
                        </span>
                        {pembelian && (
                          <span className="font-semibold text-gray-900">{fmtRupiah((it.harga ?? 0) * it.jumlah)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* ===== Desktop: tabel seperti semula ===== */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-green-100 bg-green-50/60 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">No</th>
                    <th className="px-5 py-3 font-semibold">Barang</th>
                    <th className="px-5 py-3 text-right font-semibold">Jumlah</th>
                    {pembelian && <th className="px-5 py-3 text-right font-semibold">Harga Satuan</th>}
                    {pembelian && <th className="px-5 py-3 text-right font-semibold">Subtotal</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {nota.items.map((it, i) => (
                    <tr key={it.id}>
                      <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-900">{it.barang.nama}</p>
                        {(it.barang.merk || it.barang.kode) && (
                          <p className="text-xs text-gray-500">
                            {[it.barang.merk, it.barang.kode].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        <b>{fmtAngka(it.jumlah)}</b> <span className="text-gray-500">{it.barang.satuan}</span>
                      </td>
                      {pembelian && (
                        <td className="whitespace-nowrap px-5 py-3 text-right text-gray-600">{fmtRupiah(it.harga ?? 0)}</td>
                      )}
                      {pembelian && (
                        <td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-gray-900">
                          {fmtRupiah((it.harga ?? 0) * it.jumlah)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rincian pembayaran (khusus Pembelian). HP: lebar penuh */}
            {pembelian && (
              <dl className="border-t border-green-100 px-4 py-4 text-sm sm:ml-auto sm:max-w-sm sm:px-5">
                <div className="flex justify-between gap-3 py-1">
                  <dt className="text-gray-600">Subtotal barang</dt>
                  <dd className="shrink-0 font-semibold text-gray-900">{fmtRupiah(subtotalBarang)}</dd>
                </div>
                {biaya.map((b, i) => (
                  <div key={`${b.nama}-${i}`} className="flex justify-between gap-3 py-1">
                    <dt className="min-w-0 break-words text-gray-600">{b.nama}</dt>
                    <dd className={`shrink-0 font-semibold ${b.jumlah < 0 ? "text-red-600" : "text-gray-900"}`}>
                      {fmtBertanda(b.jumlah)}
                    </dd>
                  </div>
                ))}
                <div className="mt-2 flex justify-between gap-3 border-t border-gray-200 pt-3 text-base">
                  <dt className="font-bold text-gray-900">Total pembayaran</dt>
                  <dd className="shrink-0 font-bold text-green-800">{fmtRupiah(totalBayar)}</dd>
                </div>
              </dl>
            )}
          </div>
        </div>

        {/* Foto nota (khusus Pembelian) */}
        {pembelian && (
          <section className="h-fit min-w-0 rounded-3xl border border-green-100 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="mb-3 font-semibold text-gray-900">Foto Nota</h3>
            {nota.foto ? (
              <a href={`/api/foto-nota/${nota.foto}`} target="_blank" rel="noreferrer" title="Buka ukuran penuh">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/foto-nota/${nota.foto}`}
                  alt="Foto nota pembelian"
                  className="w-full rounded-2xl border border-gray-100 object-contain"
                />
              </a>
            ) : (
              <p className="rounded-2xl border-2 border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-400">
                Tidak ada foto nota
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}