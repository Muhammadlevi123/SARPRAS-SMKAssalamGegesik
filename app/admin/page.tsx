import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { fmtAngka, fmtBulan, kodeBulan, rentangBulan } from "@/lib/format";

function KartuRingkas({
  label,
  nilai,
  ikon,
  bahaya = false,
}: {
  label: string;
  nilai: string;
  ikon: string;
  bahaya?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border p-4 ${
        bahaya ? "border-red-200 bg-red-50" : "border-green-100 bg-white"
      }`}
    >
      <div
        className={`grid size-12 shrink-0 place-items-center rounded-xl ${
          bahaya ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
        }`}
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d={ikon} />
        </svg>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{nilai}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default async function AdminPage() {
  await requireUser();

  const sekarang = new Date();

  const [jenisBarang, unit, lokasiList, cekBulanIni, cekTerbaru] = await Promise.all([
    prisma.barang.count(),
    prisma.barangMasukItem.aggregate({ _sum: { jumlah: true } }),
    prisma.lokasi.findMany({ select: { id: true, _count: { select: { barang: true } } } }),
    prisma.pengecekan.findMany({ where: { tanggal: rentangBulan(sekarang) }, select: { lokasiId: true } }),
    // Pengecekan terbaru dulu, nanti diambil yang paling akhir per lokasi
    prisma.pengecekan.findMany({
      orderBy: { tanggal: "desc" },
      take: 1000,
      select: { lokasiId: true, items: { select: { rusakRingan: true, rusakBerat: true } } },
    }),
  ]);

  const totalUnit = unit._sum.jumlah ?? 0;

  // Barang rusak = kurang baik + rusak berat dari pengecekan terakhir tiap lokasi
  const sudahDihitung = new Set<number>();
  let totalRusak = 0;
  for (const c of cekTerbaru) {
    if (sudahDihitung.has(c.lokasiId)) continue;
    sudahDihitung.add(c.lokasiId);
    totalRusak += c.items.reduce((s, i) => s + i.rusakRingan + i.rusakBerat, 0);
  }

  const lokasiBerbarang = lokasiList.filter((l) => l._count.barang > 0).length;
  const selesai = new Set(cekBulanIni.map((c) => c.lokasiId)).size;
  const persen = lokasiBerbarang ? Math.round((selesai / lokasiBerbarang) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Ringkasan */}
      <section className="rounded-3xl border border-green-100 bg-white/70 p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-800">Ringkasan</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KartuRingkas label="Jenis Barang" nilai={fmtAngka(jenisBarang)} ikon="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />
          <KartuRingkas label="Total Unit" nilai={fmtAngka(totalUnit)} ikon="M4 7h16M4 12h16M4 17h10" />
          <KartuRingkas label="Lokasi" nilai={fmtAngka(lokasiList.length)} ikon="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z" />
          <KartuRingkas
            label="Barang Kurang Baik / Rusak"
            nilai={fmtAngka(totalRusak)}
            ikon="M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
            bahaya
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Progres pengecekan bulan ini */}
        <section className="flex flex-col rounded-3xl border border-green-100 bg-white p-5 shadow-sm">
          <h2 className="font-semibold capitalize text-gray-800">Pengecekan {fmtBulan(sekarang)}</h2>
          <p className="mt-3 text-3xl font-bold text-gray-900">
            {selesai} <span className="text-base font-semibold text-gray-400">/ {lokasiBerbarang} lokasi</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-green-600" style={{ width: `${persen}%` }} />
          </div>
          <Link
            href={`/admin/pengecekan?bulan=${kodeBulan(sekarang)}`}
            className="mt-4 text-sm font-semibold text-green-700 hover:underline"
          >
            {selesai < lokasiBerbarang ? "Lanjutkan pengecekan →" : "Lihat hasil pengecekan →"}
          </Link>
        </section>

        <section className="grid place-items-center rounded-3xl border-2 border-dashed border-green-200 p-5 text-center text-sm text-gray-400 lg:col-span-2">
          Grafik kondisi barang (Baik / Kurang Baik / Rusak Berat / Hilang) muncul setelah ada pengecekan
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="grid min-h-56 place-items-center rounded-3xl border-2 border-dashed border-green-200 p-5 text-center text-sm text-gray-400 lg:col-span-3">
          Grafik barang masuk 6 bulan terakhir
        </section>
        <section className="grid min-h-56 place-items-center rounded-3xl border-2 border-dashed border-green-200 p-5 text-center text-sm text-gray-400 lg:col-span-2">
          Jumlah barang per lokasi
        </section>
      </div>
    </div>
  );
}