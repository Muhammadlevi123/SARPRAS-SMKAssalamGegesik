import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import SelectFilter from "@/components/admin/SelectFilter";
import KategoriForm from "@/components/admin/kategori/KategoriForm";
import { btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/admin/ui";
import { fmtAngka } from "@/lib/format";
import { bersihkanKategoriKosong } from "@/lib/kodeBarang";

const OPSI_URUT = [
  { value: "", label: "Nama A–Z" },
  { value: "terbanyak", label: "Barang terbanyak" },
];

export default async function KategoriPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; urut?: string }>;
}) {
  const user = await requireUser();
  const admin = user.role === "ADMIN";

  // ===== Baca pencarian dari URL =====
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const urut = sp.urut === "terbanyak" ? "terbanyak" : "";
  const adaFilter = Boolean(q || urut);

  // Kategori tanpa barang dihapus dulu, jadi yang tampil selalu kategori yang terpakai
  await bersihkanKategoriKosong(prisma);

  const daftar = await prisma.kategori.findMany({
    where: { OR: q ? [{ nama: { contains: q } }, { kode: { contains: q } }] : undefined },
    orderBy: urut === "terbanyak" ? [{ barang: { _count: "desc" } }, { nama: "asc" }] : { nama: "asc" },
    select: {
      id: true,
      nama: true,
      kode: true,
      _count: { select: { barang: true } },
      // Barang yang terakhir dicatat di kategori ini
      barang: { orderBy: { id: "desc" }, take: 1, select: { kode: true, nama: true } },
    },
  });

  return (
    <div className="min-w-0">
      <PageHeader
        judul="Kategori"
        deskripsi="Kategori bertambah otomatis saat menambah barang, dan terhapus otomatis saat barangnya habis."
      />

      {/* ===== Pencarian & Filter =====
          HP     : kartu dengan judul, kolom tersusun ke bawah + label
          Desktop: satu baris tanpa kartu (seperti semula)
          Tanpa overflow-hidden → dropdown tidak terpotong.
          relative z-20 → dropdown tampil di atas kartu daftar di bawahnya. */}
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
          <div className="flex flex-col gap-2 md:w-full md:max-w-xs">
            <p className={`${labelClass} md:hidden`}>Cari Kategori</p>
            <div className="relative">
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Cari nama atau kode kategori..."
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>

          {/* Urutkan */}
          <div className="flex flex-col gap-2">
            <p className={`${labelClass} md:hidden`}>Urutkan</p>
            <SelectFilter name="urut" label="Urutkan" defaultValue={urut} opsi={OPSI_URUT} className="w-full md:w-48" />
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
              <Link href="/admin/kategori" className={`${btnSecondary} justify-center`}>
                Reset
              </Link>
            )}
          </div>
        </div>
      </form>

      {daftar.length === 0 ? (
        <EmptyState
          judul={q ? "Kategori tidak ditemukan" : "Belum ada kategori"}
          pesan={q ? "Coba ubah kata kunci." : "Kategori akan muncul di sini setelah barang ditambahkan."}
        />
      ) : (
        <>
          {/* ===== HP: daftar dalam satu kartu ===== */}
          <section className="min-w-0 overflow-hidden rounded-3xl border border-green-100 bg-white shadow-sm md:hidden">
            {/* Judul kartu: jumlah data */}
            <div className="border-b border-green-100 bg-green-50/60 px-4 py-3">
              <p className="font-semibold text-gray-900">{fmtAngka(daftar.length)} kategori</p>
              <p className="text-xs text-gray-500">
                {urut === "terbanyak" ? "Diurutkan dari barang terbanyak" : "Diurutkan nama A–Z"}
              </p>
            </div>

            <ul className="divide-y divide-gray-100">
              {daftar.map((k) => {
                const terakhir = k.barang[0];
                return (
                  <li key={k.id} className="min-w-0 p-4">
                    {/* Ikon + nama + kode kategori */}
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-green-100 text-green-700">
                        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
                          <path d="M7.5 7.5h.01" />
                        </svg>
                      </span>
                      <p className="min-w-0 flex-1 truncate text-base font-bold text-gray-900">{k.nama}</p>
                      <span className="shrink-0 rounded-lg bg-green-50 px-2.5 py-1 font-mono text-xs font-bold text-green-700">
                        {k.kode}
                      </span>
                    </div>

                    {/* Kotak info */}
                    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 rounded-2xl bg-green-50/60 p-3">
                      <div className="min-w-0">
                        <dt className="text-xs text-gray-500">Jumlah barang</dt>
                        <dd className="mt-1">
                          <span className="inline-block rounded-full border border-green-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-green-700">
                            {fmtAngka(k._count.barang)} jenis
                          </span>
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs text-gray-500">Kode barang terakhir</dt>
                        {terakhir ? (
                          <dd className="mt-1 min-w-0">
                            <p className="truncate font-mono text-xs font-semibold text-gray-900">{terakhir.kode}</p>
                            <p className="truncate text-xs text-gray-500">{terakhir.nama}</p>
                          </dd>
                        ) : (
                          <dd className="mt-1 text-sm text-gray-400">–</dd>
                        )}
                      </div>
                    </dl>

                    {/* Aksi (khusus admin) */}
                    {admin && (
                      <div className="mt-3">
                        <KategoriForm
                          tampilan="kartu"
                          data={{ id: k.id, nama: k.nama, kode: k.kode, jumlahBarang: k._count.barang }}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ===== Desktop: tabel seperti semula ===== */}
          <div className="hidden overflow-x-auto rounded-3xl border border-green-100 bg-white shadow-sm md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-green-100 bg-green-50/60 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">No</th>
                  <th className="px-5 py-3 font-semibold">Nama Kategori</th>
                  <th className="px-5 py-3 font-semibold">Kode</th>
                  <th className="px-5 py-3 text-right font-semibold">Jumlah Barang</th>
                  <th className="px-5 py-3 font-semibold">Kode Barang Terakhir</th>
                  {admin && <th className="px-5 py-3 text-right font-semibold">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {daftar.map((k, i) => {
                  const terakhir = k.barang[0];
                  return (
                    <tr key={k.id} className="hover:bg-green-50/40">
                      <td className="px-5 py-3 text-gray-500">{i + 1}</td>
                      <td className="px-5 py-3 font-semibold text-gray-900">{k.nama}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-lg bg-green-50 px-2.5 py-1 font-mono text-xs font-bold text-green-700">{k.kode}</span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">{fmtAngka(k._count.barang)}</td>
                      <td className="px-5 py-3">
                        {terakhir ? (
                          <>
                            <p className="font-mono text-xs font-semibold text-gray-900">{terakhir.kode}</p>
                            <p className="text-xs text-gray-500">{terakhir.nama}</p>
                          </>
                        ) : (
                          <span className="text-gray-400">–</span>
                        )}
                      </td>
                      {admin && (
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <KategoriForm data={{ id: k.id, nama: k.nama, kode: k.kode, jumlahBarang: k._count.barang }} />
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}