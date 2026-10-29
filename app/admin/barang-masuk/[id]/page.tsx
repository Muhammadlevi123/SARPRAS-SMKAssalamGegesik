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

  const info = [
    { label: "Tanggal", nilai: fmtTanggal(nota.tanggal) },
    { label: "Sumber", nilai: SUMBER_LABEL[nota.sumber] },
    { label: pembelian ? "No. Nota" : "No. Dokumen", nilai: nota.noNota ?? "–" },
    ...(nota.mitra ? [{ label: "Mitra", nilai: nota.mitra.nama }] : []),
    { label: "Keterangan", nilai: nota.keterangan ?? "–" },
    ...(pembelian ? [{ label: "Total pembayaran", nilai: fmtRupiah(totalBayar) }] : []),
  ];

  return (
    <div>
      <PageHeader
        judul={judul}
        deskripsi={`${nota.items.length} barang`}
        aksi={
          <div className="flex items-center gap-2">
            <Link href="/admin/barang-masuk" className={btnSecondary}>Kembali</Link>
            <TombolHapus action={hapusBarangMasukDariDetail} id={nota.id} nama={judul} />
          </div>
        }
      />

      <div className={`grid gap-6 ${pembelian ? "lg:grid-cols-3" : ""}`}>
        <div className={`flex flex-col gap-6 ${pembelian ? "lg:col-span-2" : ""}`}>
          {/* Info nota */}
          <section className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm">
            <dl className="grid gap-4 sm:grid-cols-2">
              {info.map((x) => (
                <div key={x.label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{x.label}</dt>
                  <dd className="mt-0.5 font-semibold text-gray-900">{x.nilai}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Isi nota + rincian biaya */}
          <div className="overflow-hidden rounded-3xl border border-green-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
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

            {/* Rincian pembayaran (khusus Pembelian) */}
            {pembelian && (
              <dl className="ml-auto max-w-sm border-t border-green-100 px-5 py-4 text-sm">
                <div className="flex justify-between py-1">
                  <dt className="text-gray-600">Subtotal barang</dt>
                  <dd className="font-semibold text-gray-900">{fmtRupiah(subtotalBarang)}</dd>
                </div>
                {biaya.map((b, i) => (
                  <div key={`${b.nama}-${i}`} className="flex justify-between py-1">
                    <dt className="text-gray-600">{b.nama}</dt>
                    <dd className={`font-semibold ${b.jumlah < 0 ? "text-red-600" : "text-gray-900"}`}>
                      {fmtBertanda(b.jumlah)}
                    </dd>
                  </div>
                ))}
                <div className="mt-2 flex justify-between border-t border-gray-200 pt-3 text-base">
                  <dt className="font-bold text-gray-900">Total pembayaran</dt>
                  <dd className="font-bold text-green-800">{fmtRupiah(totalBayar)}</dd>
                </div>
              </dl>
            )}
          </div>
        </div>

        {/* Foto nota (khusus Pembelian) */}
        {pembelian && (
          <section className="h-fit rounded-3xl border border-green-100 bg-white p-5 shadow-sm">
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