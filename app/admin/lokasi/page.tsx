import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import Pagination from "@/components/admin/Pagination";
import SelectFilter from "@/components/admin/SelectFilter";
import TombolHapus from "@/components/admin/TombolHapus";
import LokasiForm from "@/components/admin/lokasi/LokasiForm";
import { btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/admin/ui";
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
    <div className="min-w-0">
      <PageHeader
        judul="Lokasi"
        deskripsi="Tempat barang ditempatkan beserta penanggung jawabnya."
        aksi={<LokasiForm />}
      />

      {/* ===== Pencarian & Filter =====
          HP     : kartu dengan judul, kolom tersusun ke bawah + label
          Desktop: satu baris tanpa kartu (seperti semula)
          Tanpa overflow-hidden → dropdown tidak terpotong.
          relative z-20 → dropdown tampil di atas kartu daftar di bawahnya.
          key: form dibuat ulang saat filter berubah (misal klik Reset) */}
      <form
        key={`${q}|${urut}`}
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
          <div className="flex flex-col gap-2 md:w-full md:max-w-sm">
            <p className={`${labelClass} md:hidden`}>Cari Lokasi</p>
            <div className="relative">
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Cari nama lokasi atau penanggung jawab..."
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
              <Link href="/admin/lokasi" className={`${btnSecondary} justify-center`}>
                Reset
              </Link>
            )}
          </div>
        </div>
      </form>

      {daftar.length === 0 ? (
        <EmptyState
          judul={q ? "Lokasi tidak ditemukan" : "Belum ada lokasi"}
          pesan={q ? "Coba kata kunci lain." : "Tambahkan lokasi dulu, misalnya Bengkel Motor, Lab Komputer 1, atau Ruang TU."}
        />
      ) : (
        <>
          {/* ===== HP: daftar dalam satu kartu ===== */}
          <section className="min-w-0 overflow-hidden rounded-3xl border border-green-100 bg-white shadow-sm md:hidden">
            {/* Judul kartu: jumlah data & halaman */}
            <div className="border-b border-green-100 bg-green-50/60 px-4 py-3">
              <p className="font-semibold text-gray-900">
                Menampilkan {daftar.length} dari {total} lokasi
              </p>
              <p className="text-xs text-gray-500">
                Halaman {halaman} dari {totalHalaman}
              </p>
            </div>

            <ul className="divide-y divide-gray-100">
              {daftar.map((l) => (
                <li key={l.id} className="min-w-0 p-4">
                  {/* Ikon + nama lokasi */}
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-green-100 text-green-700">
                      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z" />
                        <path d="M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
                      </svg>
                    </span>
                    <p className="min-w-0 truncate text-base font-bold text-gray-900">{l.nama}</p>
                  </div>

                  {/* Kotak info */}
                  <dl className="mt-3 grid grid-cols-2 gap-3 rounded-2xl bg-green-50/60 p-3">
                    <div className="min-w-0">
                      <dt className="text-xs text-gray-500">Penanggung jawab</dt>
                      <dd className="mt-1 truncate text-sm font-semibold text-gray-800">{l.penanggungJawab ?? "–"}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-gray-500">Jumlah barang</dt>
                      <dd className="mt-1">
                        <span className="inline-block rounded-full border border-green-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-green-700">
                          {l._count.barang} jenis
                        </span>
                      </dd>
                    </div>
                  </dl>

                  {/* Aksi: Edit lebar + Hapus */}
                  <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                    <LokasiForm
                      tampilan="kartu"
                      lokasi={{ id: l.id, nama: l.nama, penanggungJawab: l.penanggungJawab }}
                    />
                    <div className="grid place-items-center rounded-xl border border-red-200 bg-red-50 px-1">
                      <TombolHapus action={hapusLokasi} id={l.id} nama={l.nama} />
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