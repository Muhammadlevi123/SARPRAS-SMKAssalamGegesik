import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import SelectFilter from "@/components/admin/SelectFilter";
import KategoriForm from "@/components/admin/kategori/KategoriForm";
import { btnSecondary, inputClass } from "@/components/admin/ui";
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
    <div>
      <PageHeader
        judul="Kategori"
        deskripsi="Kategori bertambah otomatis saat menambah barang, dan terhapus otomatis saat barangnya habis."
      />

      {/* ===== Cari & urutkan ===== */}
      <form key={`${q}|${urut}`} className="mb-4 flex flex-wrap gap-3">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Cari nama atau kode kategori..."
          className={`${inputClass} sm:max-w-xs`}
        />
        <SelectFilter name="urut" label="Urutkan" defaultValue={urut} opsi={OPSI_URUT} className="w-full sm:w-48" />
        <button type="submit" className={btnSecondary}>Terapkan</button>
        {adaFilter && <Link href="/admin/kategori" className={btnSecondary}>Reset</Link>}
      </form>

      {daftar.length === 0 ? (
        <EmptyState
          judul={q ? "Kategori tidak ditemukan" : "Belum ada kategori"}
          pesan={q ? "Coba ubah kata kunci." : "Kategori akan muncul di sini setelah barang ditambahkan."}
        />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-green-100 bg-white shadow-sm">
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
      )}
    </div>
  );
}