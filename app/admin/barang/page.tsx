import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import Pagination from "@/components/admin/Pagination";
import SelectFilter from "@/components/admin/SelectFilter";
import TombolHapus from "@/components/admin/TombolHapus";
import BarangForm from "@/components/admin/barang/BarangForm";
import { btnPrimary, btnSecondary, inputClass } from "@/components/admin/ui";
import { OPSI_URUT, PER_HALAMAN, bacaHalaman, bacaUrut, orderByNama } from "@/lib/paging";
import { hapusBarang } from "./actions";

export default async function BarangPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; lokasi?: string; urut?: string; halaman?: string }>;
}) {
  await requireUser();

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const lokasiId = Number(sp.lokasi) || 0;
  const urut = bacaUrut(sp.urut);
  const adaFilter = Boolean(q || lokasiId) || urut !== "terbaru";

  const where = {
    lokasiId: lokasiId || undefined,
    OR: q
      ? [
          { nama: { contains: q } },
          { kode: { contains: q } },
          { merk: { contains: q } },
          { kategori: { contains: q } },
        ]
      : undefined,
  };

  const [lokasiList, kategoriRows, satuanRows, merkRows, total] = await Promise.all([
    prisma.lokasi.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
    // Pilihan dropdown hanya dari data yang sudah tersimpan
    prisma.barang.findMany({
      where: { kategori: { not: null } },
      distinct: ["kategori"],
      select: { kategori: true },
      orderBy: { kategori: "asc" },
    }),
    prisma.barang.findMany({
      distinct: ["satuan"],
      select: { satuan: true },
      orderBy: { satuan: "asc" },
    }),
    prisma.barang.findMany({
      where: { merk: { not: null } },
      distinct: ["merk"],
      select: { merk: true },
      orderBy: { merk: "asc" },
    }),
    prisma.barang.count({ where }),
  ]);

  const kategoriList = kategoriRows.map((k) => k.kategori).filter((k): k is string => !!k);
  const satuanList = satuanRows.map((s) => s.satuan);
  const merkList = merkRows.map((m) => m.merk).filter((m): m is string => !!m);

  const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const halaman = Math.min(bacaHalaman(sp.halaman), totalHalaman);

  const daftar = await prisma.barang.findMany({
    where,
    include: { lokasi: { select: { nama: true } } },
    orderBy: orderByNama(urut),
    skip: (halaman - 1) * PER_HALAMAN,
    take: PER_HALAMAN,
  });

  // Jumlah tiap barang = total dari semua isi nota barang masuk
  const totals = await prisma.barangMasukItem.groupBy({
    by: ["barangId"],
    where: { barangId: { in: daftar.map((b) => b.id) } },
    _sum: { jumlah: true },
  });
  const totalMap = new Map(totals.map((t) => [t.barangId, t._sum.jumlah ?? 0]));

  if (lokasiList.length === 0) {
    return (
      <div>
        <PageHeader judul="Barang" deskripsi="Daftar barang di setiap lokasi." />
        <EmptyState judul="Belum ada lokasi" pesan="Setiap barang harus punya lokasi. Tambahkan lokasi terlebih dahulu.">
          <Link href="/admin/lokasi" className={btnPrimary}>Ke halaman Lokasi</Link>
        </EmptyState>
      </div>
    );
  }

  const opsiForm = { lokasiList, kategoriList, satuanList, merkList };

  return (
    <div>
      <PageHeader
        judul="Barang"
        deskripsi="Daftar barang di setiap lokasi. Jumlah dihitung dari barang masuk."
        aksi={<BarangForm {...opsiForm} />}
      />

      <form key={`${q}|${lokasiId}|${urut}`} className="mb-4 flex flex-wrap gap-3">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Cari nama, kode, merk, atau kategori..."
          className={`${inputClass} sm:max-w-xs`}
        />
        <SelectFilter
          name="lokasi"
          label="Filter lokasi"
          defaultValue={lokasiId ? String(lokasiId) : ""}
          opsi={[
            { value: "", label: "Semua lokasi" },
            ...lokasiList.map((l) => ({ value: String(l.id), label: l.nama })),
          ]}
          bisaCari
          className="w-full sm:w-56"
        />
        <SelectFilter
          name="urut"
          label="Urutkan"
          defaultValue={urut}
          opsi={OPSI_URUT}
          className="w-full sm:w-52"
        />
        <button type="submit" className={btnSecondary}>Terapkan</button>
        {adaFilter && <Link href="/admin/barang" className={btnSecondary}>Reset</Link>}
      </form>

      {daftar.length === 0 ? (
        <EmptyState
          judul={q || lokasiId ? "Barang tidak ditemukan" : "Belum ada barang"}
          pesan={q || lokasiId ? "Coba ubah kata kunci atau pilihan lokasi." : "Klik Tambah Barang untuk mulai mencatat."}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-3xl border border-green-100 bg-white shadow-sm">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-green-100 bg-green-50/60 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">No</th>
                  <th className="px-5 py-3 font-semibold">Kode</th>
                  <th className="px-5 py-3 font-semibold">Nama Barang</th>
                  <th className="px-5 py-3 font-semibold">Merk</th>
                  <th className="px-5 py-3 font-semibold">Kategori</th>
                  <th className="px-5 py-3 font-semibold">Lokasi</th>
                  <th className="px-5 py-3 text-right font-semibold">Jumlah</th>
                  <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {daftar.map((b, i) => (
                  <tr key={b.id} className="hover:bg-green-50/40">
                    <td className="px-5 py-3 text-gray-400">{(halaman - 1) * PER_HALAMAN + i + 1}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{b.kode ?? "–"}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900">{b.nama}</td>
                    <td className="px-5 py-3 text-gray-600">{b.merk ?? "–"}</td>
                    <td className="px-5 py-3 text-gray-600">{b.kategori ?? "–"}</td>
                    <td className="px-5 py-3 text-gray-600">{b.lokasi.nama}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <span className="font-semibold text-gray-900">
                        {(totalMap.get(b.id) ?? 0).toLocaleString("id-ID")}
                      </span>{" "}
                      <span className="text-gray-500">{b.satuan}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <BarangForm
                          {...opsiForm}
                          barang={{
                            id: b.id,
                            kode: b.kode,
                            nama: b.nama,
                            merk: b.merk,
                            kategori: b.kategori,
                            satuan: b.satuan,
                            lokasiId: b.lokasiId,
                          }}
                        />
                        <TombolHapus action={hapusBarang} id={b.id} nama={b.nama} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            basePath="/admin/barang"
            params={{
              q: q || undefined,
              lokasi: lokasiId ? String(lokasiId) : undefined,
              urut: urut === "terbaru" ? undefined : urut,
            }}
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