import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePengguna } from "@/lib/auth";
import { rekapKondisi } from "@/lib/stok";
import { fmtAngka, fmtBulan, fmtTanggalPendek, kodeBulan, rentangBulan } from "@/lib/format";

const KONDISI = [
  { kunci: "baik", label: "Baik", cls: "bg-green-50 text-green-700" },
  { kunci: "kurang", label: "Kurang Baik", cls: "bg-amber-50 text-amber-700" },
  { kunci: "rusak", label: "Rusak Berat", cls: "bg-red-50 text-red-700" },
  { kunci: "hilang", label: "Hilang", cls: "bg-gray-100 text-gray-700" },
] as const;

export default async function DashboardUserPage() {
  const user = await requirePengguna();
  const lokasiId = user.lokasi.id;
  const sekarang = new Date();
  const bulanIni = rentangBulan(sekarang);

  const [jenisBarang, unit, cekBulanIni, cekTerakhir, periodeBulanIni] = await Promise.all([
    prisma.barang.count({ where: { lokasiId } }),
    prisma.barangMasukItem.aggregate({ where: { barang: { lokasiId } }, _sum: { jumlah: true } }),
    prisma.pengecekan.findFirst({
      where: { lokasiId, tanggal: bulanIni },
      select: { tanggal: true, petugas: true },
    }),
    // Pengecekan terakhir (untuk kondisi barang)
    prisma.pengecekan.findFirst({
      where: { lokasiId },
      orderBy: { tanggal: "desc" },
      select: {
        tanggal: true,
        lokasiId: true,
        items: { select: { barangId: true, jumlahAda: true, rusakRingan: true, rusakBerat: true } },
      },
    }),
    // Apakah admin sudah membuka pengecekan bulan ini?
    prisma.periodePengecekan.findFirst({ where: { bulan: bulanIni }, select: { id: true } }),
  ]);

  const kondisi = cekTerakhir ? await rekapKondisi([cekTerakhir]) : null;
  const bisaCek = Boolean(periodeBulanIni || cekBulanIni);

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
      {/* Ringkasan */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="min-w-0 rounded-2xl border border-green-100 bg-white p-4 shadow-sm">
          <p className="truncate text-2xl font-bold text-gray-900">{fmtAngka(jenisBarang)}</p>
          <p className="text-xs font-medium text-gray-500 sm:text-sm">Jenis Barang</p>
        </div>
        <div className="min-w-0 rounded-2xl border border-green-100 bg-white p-4 shadow-sm">
          <p className="truncate text-2xl font-bold text-gray-900">{fmtAngka(unit._sum.jumlah ?? 0)}</p>
          <p className="text-xs font-medium text-gray-500 sm:text-sm">Total Unit</p>
        </div>
      </section>

      {/* Pengecekan bulan ini */}
      <section
        className={`flex flex-col gap-3 rounded-3xl border p-4 shadow-sm sm:p-5 ${
          cekBulanIni ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"
        }`}
      >
        <div>
          <h2 className="font-semibold capitalize text-gray-900">Pengecekan {fmtBulan(sekarang)}</h2>
          {cekBulanIni ? (
            <p className="mt-1 text-sm text-green-800">
              ✓ Sudah dicek pada <b>{fmtTanggalPendek(cekBulanIni.tanggal)}</b> oleh {cekBulanIni.petugas}.
            </p>
          ) : bisaCek ? (
            <p className="mt-1 text-sm text-amber-800">Lokasi Anda belum dicek bulan ini.</p>
          ) : (
            <p className="mt-1 text-sm text-amber-800">Admin belum membuka pengecekan untuk bulan ini.</p>
          )}
        </div>

        {bisaCek && (
          <Link
            href={`/user/pengecekan/${kodeBulan(sekarang)}`}
            className={`flex h-11 items-center justify-center rounded-xl text-sm font-semibold sm:w-fit sm:px-6 ${
              cekBulanIni
                ? "border border-green-200 bg-white text-green-700 active:bg-green-50"
                : "bg-green-700 text-white active:bg-green-800"
            }`}
          >
            {cekBulanIni ? "Lihat / Edit pengecekan" : "Mulai cek sekarang"}
          </Link>
        )}
      </section>

      {/* Kondisi barang dari pengecekan terakhir */}
      <section className="rounded-3xl border border-green-100 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="font-semibold text-gray-900">Kondisi Barang Terakhir</h2>
        {kondisi && cekTerakhir ? (
          <>
            <p className="text-xs text-gray-400">Dari pengecekan {fmtTanggalPendek(cekTerakhir.tanggal)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {KONDISI.map((k) => (
                <div key={k.kunci} className={`min-w-0 rounded-2xl px-3 py-2.5 ${k.cls}`}>
                  <p className="truncate text-xl font-bold">{fmtAngka(kondisi[k.kunci])}</p>
                  <p className="truncate text-xs font-semibold">{k.label}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-gray-400">Kondisi barang muncul setelah lokasi Anda dicek.</p>
        )}
      </section>
    </div>
  );
}