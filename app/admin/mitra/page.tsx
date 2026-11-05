import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import Pagination from "@/components/admin/Pagination";
import SelectFilter from "@/components/admin/SelectFilter";
import TombolHapus from "@/components/admin/TombolHapus";
import MitraForm from "@/components/admin/mitra/MitraForm";
import { btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/admin/ui";
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
    <div className="min-w-0">
      <PageHeader
        judul="Mitra"
        deskripsi="Pihak yang bekerja sama (MOU) atau memberi bantuan barang."
        aksi={<MitraForm />}
      />

      {/* ===== Pencarian & Filter =====
          HP     : kartu dengan judul, kolom tersusun ke bawah + label
          Desktop: satu baris tanpa kartu (seperti semula) */}
      <form
        key={`${q}|${urut}`}
                className="mb-4 rounded-3xl border border-green-100 bg-white shadow-sm md:rounded-none md:border-0 md:bg-transparent md:shadow-none"
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
          <div className="flex flex-col gap-2 md:w-full md:max-w-sm">
            <p className={`${labelClass} md:hidden`}>Cari Mitra</p>
            <div className="relative">
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Cari nama mitra atau kontak..."
                className={`${inputClass} pl-10`}
              />
            </div>
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
              <Link href="/admin/mitra" className={`${btnSecondary} justify-center`}>
                Reset
              </Link>
            )}
          </div>
        </div>
      </form>

      {daftar.length === 0 ? (
        <EmptyState
          judul={q ? "Mitra tidak ditemukan" : "Belum ada mitra"}
          pesan={q ? "Coba kata kunci lain." : "Contoh: perusahaan DU/DI, dinas pendidikan, atau donatur."}
        />
      ) : (
        <>
          {/* ===== HP: daftar dalam satu kartu ===== */}
          <section className="min-w-0 overflow-hidden rounded-3xl border border-green-100 bg-white shadow-sm md:hidden">
            {/* Judul kartu: jumlah data & halaman */}
            <div className="border-b border-green-100 bg-green-50/60 px-4 py-3">
              <p className="font-semibold text-gray-900">
                Menampilkan {daftar.length} dari {total} mitra
              </p>
              <p className="text-xs text-gray-500">
                Halaman {halaman} dari {totalHalaman}
              </p>
            </div>

            <ul className="divide-y divide-gray-100">
              {daftar.map((m) => (
                <li key={m.id} className="min-w-0 p-4">
                  {/* Ikon + nama mitra */}
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-green-100 text-green-700">
                      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m11 17 2 2a1 1 0 1 0 3-3" />
                        <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
                        <path d="m21 3 1 11h-2" />
                        <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
                        <path d="M3 4h8" />
                      </svg>
                    </span>
                    <p className="min-w-0 truncate text-base font-bold text-gray-900">{m.nama}</p>
                  </div>

                  {/* Kotak info */}
                  <dl className="mt-3 grid grid-cols-2 gap-3 rounded-2xl bg-green-50/60 p-3">
                    <div className="min-w-0">
                      <dt className="text-xs text-gray-500">Kontak</dt>
                      <dd className="mt-1 break-words text-sm font-semibold text-gray-800">{m.kontak ?? "–"}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-gray-500">Riwayat</dt>
                      <dd className="mt-1">
                        <span className="inline-block rounded-full border border-green-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-green-700">
                          {m._count.barangMasuk} nota
                        </span>
                      </dd>
                    </div>
                  </dl>

                  {/* Aksi: Edit lebar + Hapus */}
                  <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                    <MitraForm tampilan="kartu" mitra={{ id: m.id, nama: m.nama, kontak: m.kontak }} />
                    <div className="grid place-items-center rounded-xl border border-red-200 bg-red-50 px-1">
                      <TombolHapus action={hapusMitra} id={m.id} nama={m.nama} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* ===== Desktop: tabel seperti semula ===== */}
          <div className="hidden overflow-hidden rounded-3xl border border-green-100 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
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