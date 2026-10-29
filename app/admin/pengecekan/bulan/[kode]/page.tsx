import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rekapKondisi } from "@/lib/stok";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import SelectFilter from "@/components/admin/SelectFilter";
import KartuKondisi from "@/components/admin/pengecekan/KartuKondisi";
import { btnPrimary, btnSecondary, inputClass } from "@/components/admin/ui";
import { fmtAngka, fmtBulan, fmtTanggalPendek, kodeBulan, parseBulan, rentangBulan } from "@/lib/format";

const OPSI_STATUS = [
  { value: "", label: "Semua status" },
  { value: "belum", label: "Belum dicek" },
  { value: "selesai", label: "Sudah dicek" },
];

export default async function PengecekanBulanPage({
  params,
  searchParams,
}: {
  params: Promise<{ kode: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireUser();

  const awal = parseBulan((await params).kode);
  if (!awal) notFound();

  const sp = await searchParams;
  const kode = kodeBulan(awal);
  const q = (sp.q ?? "").trim();
  const status = sp.status === "belum" || sp.status === "selesai" ? sp.status : "";
  const dasar = `/admin/pengecekan/bulan/${kode}`;

  const [lokasiList, cekBulanIni] = await Promise.all([
    prisma.lokasi.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, penanggungJawab: true, _count: { select: { barang: true } } },
    }),
    prisma.pengecekan.findMany({
      where: { tanggal: rentangBulan(awal) },
      select: {
        id: true,
        lokasiId: true,
        tanggal: true,
        items: { select: { barangId: true, jumlahAda: true, rusakRingan: true, rusakBerat: true } },
      },
    }),
  ]);

  const rekapBulan = await rekapKondisi(cekBulanIni);
  const cekPerLokasi = new Map(cekBulanIni.map((c) => [c.lokasiId, c]));

  // Progres dihitung dari lokasi yang punya barang
  const lokasiBerbarang = lokasiList.filter((l) => l._count.barang > 0);
  const selesai = lokasiBerbarang.filter((l) => cekPerLokasi.has(l.id)).length;
  const persen = lokasiBerbarang.length ? Math.round((selesai / lokasiBerbarang.length) * 100) : 0;

  const tampil = lokasiList.filter((l) => {
    if (q && !`${l.nama} ${l.penanggungJawab ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (status === "selesai") return cekPerLokasi.has(l.id);
    if (status === "belum") return !cekPerLokasi.has(l.id) && l._count.barang > 0;
    return true;
  });

  return (
    <div>
      <PageHeader
        judul={`Pengecekan ${fmtBulan(awal)}`}
        deskripsi="Pilih lokasi untuk mulai mengecek atau melihat hasilnya."
        aksi={<Link href="/admin/pengecekan" className={btnSecondary}>Kembali</Link>}
      />

      {/* Ringkasan kondisi bulan ini */}
      <KartuKondisi rekap={rekapBulan} />

      {/* Progres lokasi */}
      <section className="mb-4 rounded-3xl border border-green-100 bg-white p-4 shadow-sm">
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-gray-500">Lokasi selesai dicek</span>
          <b className="text-gray-900">{selesai} / {lokasiBerbarang.length}</b>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-green-600" style={{ width: `${persen}%` }} />
        </div>
      </section>

      {/* Cari & filter */}
      <form key={`${q}|${status}`} action={dasar} className="mb-4 flex flex-wrap gap-3">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Cari lokasi atau penanggung jawab..."
          className={`${inputClass} sm:max-w-sm`}
        />
        <SelectFilter name="status" label="Filter status" defaultValue={status} opsi={OPSI_STATUS} className="w-full sm:w-48" />
        <button type="submit" className={btnSecondary}>Terapkan</button>
        {(q || status) && <Link href={dasar} className={btnSecondary}>Reset</Link>}
      </form>

      {lokasiList.length === 0 ? (
        <EmptyState judul="Belum ada lokasi" pesan="Tambahkan lokasi dan barang terlebih dahulu.">
          <Link href="/admin/lokasi" className={btnPrimary}>Ke halaman Lokasi</Link>
        </EmptyState>
      ) : tampil.length === 0 ? (
        <EmptyState judul="Tidak ada lokasi untuk filter ini" pesan="Coba ubah kata kunci atau status." />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3">
          {tampil.map((l) => {
            const cek = cekPerLokasi.get(l.id);
            const kurang = cek?.items.reduce((t, i) => t + i.rusakRingan, 0) ?? 0;
            const rusak = cek?.items.reduce((t, i) => t + i.rusakBerat, 0) ?? 0;
            const kosong = l._count.barang === 0;

            return (
              <div
                key={l.id}
                className={`flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm ${
                  cek ? "border-green-200" : "border-gray-200"
                }`}
              >
                <div>
                  <p className="font-semibold text-gray-900">{l.nama}</p>
                  <p className="text-xs text-gray-500">
                    PJ: {l.penanggungJawab ?? "–"} · {fmtAngka(l._count.barang)} barang
                  </p>
                </div>

                {kosong ? (
                  <span className="w-fit rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
                    Belum ada barang
                  </span>
                ) : cek ? (
                  <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-green-700">
                      ✓ Dicek {fmtTanggalPendek(cek.tanggal)}
                    </span>
                    {kurang > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">{kurang} kurang baik</span>}
                    {rusak > 0 && <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700">{rusak} rusak berat</span>}
                    {kurang === 0 && rusak === 0 && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">Semua baik</span>
                    )}
                  </div>
                ) : (
                  <span className="w-fit rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    Belum dicek
                  </span>
                )}

                {!kosong && (
                  <Link
                    href={`/admin/pengecekan/lokasi/${l.id}?bulan=${kode}`}
                    className={`mt-auto ${cek ? btnSecondary : btnPrimary} h-10`}
                  >
                    {cek ? "Lihat / Edit" : "Mulai cek"}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}