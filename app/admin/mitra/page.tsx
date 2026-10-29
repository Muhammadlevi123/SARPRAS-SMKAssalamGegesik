import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import Pagination from "@/components/admin/Pagination";
import SelectFilter from "@/components/admin/SelectFilter";
import TombolHapus from "@/components/admin/TombolHapus";
import MitraForm from "@/components/admin/mitra/MitraForm";
import { btnSecondary, inputClass } from "@/components/admin/ui";
import { OPSI_URUT, PER_HALAMAN, bacaHalaman, bacaUrut, orderByNama } from "@/lib/paging";
import { hapusMitra } from "./actions";

export default async function MitraPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; urut?: string; halaman?: string }>;
}) {
  await requireUser();

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const urut = bacaUrut(sp.urut);
  const adaFilter = Boolean(q) || urut !== "terbaru";

  const where = q ? { OR: [{ nama: { contains: q } }, { kontak: { contains: q } }] } : undefined;

  const total = await prisma.mitra.count({ where });
  const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const halaman = Math.min(bacaHalaman(sp.halaman), totalHalaman);

  const daftar = await prisma.mitra.findMany({
    where,
    orderBy: orderByNama(urut),
    skip: (halaman - 1) * PER_HALAMAN,
    take: PER_HALAMAN,
    include: { _count: { select: { barangMasuk: true } } },
  });

  return (
    <div>
      <PageHeader
        judul="Mitra"
        deskripsi="Pihak yang bekerja sama (MOU) atau memberi bantuan barang."
        aksi={<MitraForm />}
      />

      <form key={`${q}|${urut}`} className="mb-4 flex flex-wrap gap-3">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Cari nama mitra atau kontak..."
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
        {adaFilter && <Link href="/admin/mitra" className={btnSecondary}>Reset</Link>}
      </form>

      {daftar.length === 0 ? (
        <EmptyState
          judul={q ? "Mitra tidak ditemukan" : "Belum ada mitra"}
          pesan={q ? "Coba kata kunci lain." : "Contoh: perusahaan DU/DI, dinas pendidikan, atau donatur."}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-3xl border border-green-100 bg-white shadow-sm">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-green-100 bg-green-50/60 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">No</th>
                  <th className="px-5 py-3 font-semibold">Nama Mitra</th>
                  <th className="px-5 py-3 font-semibold">Kontak</th>
                  <th className="px-5 py-3 font-semibold">Riwayat</th>
                  <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {daftar.map((m, i) => (
                  <tr key={m.id} className="hover:bg-green-50/40">
                    <td className="px-5 py-3 text-gray-400">{(halaman - 1) * PER_HALAMAN + i + 1}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900">{m.nama}</td>
                    <td className="px-5 py-3 text-gray-600">{m.kontak ?? "–"}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                        {m._count.barangMasuk} nota barang masuk
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <MitraForm mitra={{ id: m.id, nama: m.nama, kontak: m.kontak }} />
                        <TombolHapus action={hapusMitra} id={m.id} nama={m.nama} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            basePath="/admin/mitra"
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