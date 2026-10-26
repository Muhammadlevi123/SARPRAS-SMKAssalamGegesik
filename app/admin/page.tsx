import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const fmt = (n: number) => n.toLocaleString("id-ID");
const tglPanjang = (d: Date) =>
  d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

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

  const now = new Date();
  const awalBulan = new Date(now.getFullYear(), now.getMonth(), 1);
  const awalBulanDepan = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const namaBulan = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const [jenisBarang, unit, totalLokasi, cekTerakhir, cekBulanIni] = await Promise.all([
    prisma.barang.count(),
    prisma.penambahan.aggregate({ _sum: { jumlah: true } }),
    prisma.lokasi.count(),
    prisma.pengecekan.findFirst({
      orderBy: { tanggal: "desc" },
      include: { items: { select: { jumlahRusak: true } } },
    }),
    prisma.pengecekan.findFirst({
      where: { tanggal: { gte: awalBulan, lt: awalBulanDepan } },
    }),
  ]);

  const totalUnit = unit._sum.jumlah ?? 0;
  const totalRusak = cekTerakhir?.items.reduce((s, i) => s + i.jumlahRusak, 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Ringkasan */}
      <section className="rounded-3xl border border-green-100 bg-white/70 p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-800">Ringkasan</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KartuRingkas label="Jenis Barang" nilai={fmt(jenisBarang)} ikon="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />
          <KartuRingkas label="Total Unit" nilai={fmt(totalUnit)} ikon="M4 7h16M4 12h16M4 17h10" />
          <KartuRingkas label="Lokasi" nilai={fmt(totalLokasi)} ikon="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z" />
          <KartuRingkas label="Barang Rusak" nilai={fmt(totalRusak)} ikon="M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" bahaya />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status pengecekan bulan ini */}
        <section className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800">Pengecekan {namaBulan}</h2>
          {cekBulanIni ? (
            <div className="mt-4">
              <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                Sudah dicek
              </span>
              <p className="mt-3 text-sm text-gray-600">
                {tglPanjang(cekBulanIni.tanggal)} oleh <b>{cekBulanIni.petugas}</b>
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                Belum dicek
              </span>
              <p className="mt-3 text-sm text-gray-600">
                Pengecekan bulan ini belum dilakukan.
              </p>
            </div>
          )}
        </section>

        {/* Tempat grafik (diisi setelah ada data) */}
        <section className="grid place-items-center rounded-3xl border-2 border-dashed border-green-200 p-5 text-center text-sm text-gray-400 lg:col-span-2">
          Grafik kondisi barang (Baik / Rusak / Hilang) muncul setelah ada pengecekan
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