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
    <div>
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
        <div className="overflow-x-auto rounded-3xl border border-green-100 bg-white shadow-sm">
          <table className="w-full min-w-[560px] text-left text-sm">
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
      )}
    </div>
  );
}