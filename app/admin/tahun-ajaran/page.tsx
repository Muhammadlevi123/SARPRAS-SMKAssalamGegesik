import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { tahunAjaranAktif } from "@/lib/periode";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import TombolHapus from "@/components/admin/TombolHapus";
import TahunAjaranForm from "@/components/admin/tahun-ajaran/TahunAjaranForm";
import { fmtTanggal, tanggalInput } from "@/lib/format";
import { hapusTahunAjaran } from "./actions";

export default async function TahunAjaranPage() {
  await requireUser();

  const [daftar, aktif] = await Promise.all([
    prisma.tahunAjaran.findMany({ orderBy: { mulai: "desc" } }),
    tahunAjaranAktif(),
  ]);

  return (
    <div className="min-w-0">
      <PageHeader
        judul="Kelola Tahun Ajaran"
        deskripsi="Dipakai untuk filter laporan per tahun ajaran."
        aksi={<TahunAjaranForm />}
      />

      {daftar.length === 0 ? (
        <EmptyState
          judul="Belum ada tahun ajaran"
          pesan="Tambahkan tahun ajaran yang sedang berjalan beserta tanggal mulai dan selesainya."
        />
      ) : (
        <>
          {/* ===== HP: daftar kartu ===== */}
          <section className="min-w-0 overflow-hidden rounded-3xl border border-green-100 bg-white shadow-sm md:hidden">
            <div className="border-b border-green-100 bg-green-50/60 px-4 py-3">
              <p className="font-semibold text-gray-900">{daftar.length} tahun ajaran</p>
              <p className="text-xs text-gray-500">Terbaru di atas</p>
            </div>

            <ul className="divide-y divide-gray-100">
              {daftar.map((ta) => {
                const dataForm = {
                  id: ta.id,
                  nama: ta.nama,
                  mulai: tanggalInput(ta.mulai),
                  selesai: tanggalInput(ta.selesai),
                };
                return (
                  <li key={ta.id} className="min-w-0 p-4">
                    {/* Ikon + nama + status aktif */}
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-green-100 text-green-700">
                        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                          <path d="M4 10h16" />
                          <path d="M8 3v4" />
                          <path d="M16 3v4" />
                        </svg>
                      </span>
                      <p className="min-w-0 flex-1 truncate text-base font-bold text-gray-900">{ta.nama}</p>
                      {aktif?.id === ta.id && (
                        <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold text-green-700">
                          AKTIF
                        </span>
                      )}
                    </div>

                    {/* Kotak info */}
                    <dl className="mt-3 grid grid-cols-2 gap-3 rounded-2xl bg-green-50/60 p-3">
                      <div className="min-w-0">
                        <dt className="text-xs text-gray-500">Mulai</dt>
                        <dd className="mt-0.5 text-sm font-semibold text-gray-800">{fmtTanggal(ta.mulai)}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs text-gray-500">Selesai</dt>
                        <dd className="mt-0.5 text-sm font-semibold text-gray-800">{fmtTanggal(ta.selesai)}</dd>
                      </div>
                    </dl>

                    {/* Aksi: Edit lebar + Hapus */}
                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                      <TahunAjaranForm tampilan="kartu" data={dataForm} />
                      <div className="grid place-items-center rounded-xl border border-red-200 bg-red-50 px-1">
                        <TombolHapus action={hapusTahunAjaran} id={ta.id} nama={`Tahun ajaran ${ta.nama}`} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ===== Desktop: tabel seperti semula ===== */}
          <div className="hidden overflow-hidden rounded-3xl border border-green-100 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-green-100 bg-green-50/60 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Tahun Ajaran</th>
                  <th className="px-5 py-3 font-semibold">Mulai</th>
                  <th className="px-5 py-3 font-semibold">Selesai</th>
                  <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {daftar.map((ta) => (
                  <tr key={ta.id}>
                    <td className="px-5 py-3 font-semibold text-gray-900">
                      {ta.nama}
                      {aktif?.id === ta.id && (
                        <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                          AKTIF
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{fmtTanggal(ta.mulai)}</td>
                    <td className="px-5 py-3 text-gray-600">{fmtTanggal(ta.selesai)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-start justify-end gap-1">
                        <TahunAjaranForm
                          data={{ id: ta.id, nama: ta.nama, mulai: tanggalInput(ta.mulai), selesai: tanggalInput(ta.selesai) }}
                        />
                        <TombolHapus action={hapusTahunAjaran} id={ta.id} nama={`Tahun ajaran ${ta.nama}`} />
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