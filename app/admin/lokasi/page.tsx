import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import Pagination from "@/components/admin/Pagination";
import SelectFilter from "@/components/admin/SelectFilter";
import TombolHapus from "@/components/admin/TombolHapus";
import LokasiForm from "@/components/admin/lokasi/LokasiForm";
import { btnSecondary, inputClass } from "@/components/admin/ui";
import { OPSI_URUT, PER_HALAMAN, bacaHalaman, bacaUrut, orderByNama } from "@/lib/paging";
import { hapusLokasi } from "./actions";

export default async function LokasiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; urut?: string; halaman?: string }>;
}) {
  await requireUser();

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const urut = bacaUrut(sp.urut);
  const adaFilter = Boolean(q) || urut !== "terbaru";

  const where = q
    ? { OR: [{ nama: { contains: q } }, { penanggungJawab: { contains: q } }] }
    : undefined;

  const total = await prisma.lokasi.count({ where });
  const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const halaman = Math.min(bacaHalaman(sp.halaman), totalHalaman);

  const daftar = await prisma.lokasi.findMany({
    where,
    orderBy: orderByNama(urut),
    skip: (halaman - 1) * PER_HALAMAN,
    take: PER_HALAMAN,
    include: { _count: { select: { barang: true } } },
  });

  return (
    <div>
      <PageHeader
        judul="Lokasi"
        deskripsi="Tempat barang ditempatkan beserta penanggung jawabnya."
        aksi={<LokasiForm />}
      />

      {/* key: form dibuat ulang saat filter berubah (misal klik Reset) */}
      <form key={`${q}|${urut}`} className="mb-4 flex flex-wrap gap-3">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Cari nama lokasi atau penanggung jawab..."
          className={`${inputClass} sm:max-w-sm`}
        />
        <SelectFilter
          name="urut"
          label="Urutkan"
          defaultValue={urut}
          opsi={OPSI_URUT}
          className="w-full sm:w-52"
        />
        <button type="submit" className={btnSecondary}>Terapkan</button>
        {adaFilter && <Link href="/admin/lokasi" className={btnSecondary}>Reset</Link>}
      </form>

      {daftar.length === 0 ? (
        <EmptyState
          judul={q ? "Lokasi tidak ditemukan" : "Belum ada lokasi"}
          pesan={q ? "Coba kata kunci lain." : "Tambahkan lokasi dulu, misalnya Bengkel Motor, Lab Komputer 1, atau Ruang TU."}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-3xl border border-green-100 bg-white shadow-sm">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-green-100 bg-green-50/60 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">No</th>
                  <th className="px-5 py-3 font-semibold">Nama Lokasi</th>
                  <th className="px-5 py-3 font-semibold">Penanggung Jawab</th>
                  <th className="px-5 py-3 font-semibold">Jumlah Barang</th>
                  <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {daftar.map((l, i) => (
                  <tr key={l.id} className="hover:bg-green-50/40">
                    <td className="px-5 py-3 text-gray-400">{(halaman - 1) * PER_HALAMAN + i + 1}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900">{l.nama}</td>
                    <td className="px-5 py-3 text-gray-600">{l.penanggungJawab ?? "–"}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                        {l._count.barang} jenis
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <LokasiForm lokasi={{ id: l.id, nama: l.nama, penanggungJawab: l.penanggungJawab }} />
                        <TombolHapus action={hapusLokasi} id={l.id} nama={l.nama} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            basePath="/admin/lokasi"
            params={{ q: q || undefined, urut: urut === "terbaru" ? undefined : urut }}
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