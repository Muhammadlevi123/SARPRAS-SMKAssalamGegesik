import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rekapKondisi } from "@/lib/stok";
import { SUMBER_LABEL, fmtAngka, fmtBulan, fmtTanggalPendek, kodeBulan, rentangBulan } from "@/lib/format";

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
      <div className="min-w-0">
        <p className="truncate text-2xl font-bold text-gray-900">{nilai}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

// Kartu putih dengan judul (+ link "Lihat semua")
function Panel({ judul, href, className = "", children }: { judul: string; href?: string; className?: string; children: ReactNode }) {
  return (
    <section className={`flex flex-col rounded-3xl border border-green-100 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold capitalize text-gray-800">{judul}</h2>
        {href && (
          <Link href={href} className="text-sm font-semibold text-green-700 hover:underline">
            Lihat semua →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

const Kosong = ({ teks }: { teks: string }) => (
  <p className="grid flex-1 place-items-center py-6 text-center text-sm text-gray-400">{teks}</p>
);

const KONDISI = [
  { kunci: "baik", label: "Baik", warna: "bg-green-600", teks: "text-green-700" },
  { kunci: "kurang", label: "Kurang Baik", warna: "bg-amber-500", teks: "text-amber-600" },
  { kunci: "rusak", label: "Rusak Berat", warna: "bg-red-600", teks: "text-red-600" },
  { kunci: "hilang", label: "Hilang", warna: "bg-gray-500", teks: "text-gray-700" },
] as const;

// "Kunci torsi, Dongkrak +2"
const ringkasNama = (nama: string[]) =>
  nama.length > 2 ? `${nama.slice(0, 2).join(", ")} +${nama.length - 2}` : nama.join(", ");

export default async function AdminPage() {
  const user = await requireUser();
  const admin = user.role === "ADMIN";

  // Admin: semua lokasi. User: hanya lokasinya sendiri
  const lokasiId = admin ? undefined : (user.lokasiId ?? undefined);
  const sekarang = new Date();

  const [jenisBarang, unit, jumlahLokasi, lokasiPerluCek, sudahCek, cekTerakhir, pengajuan, barangMasuk, akunMenunggu] =
    await Promise.all([
      prisma.barang.count({ where: { lokasiId } }),
      prisma.barangMasukItem.aggregate({ where: { barang: { lokasiId } }, _sum: { jumlah: true } }),
      prisma.lokasi.count({ where: { id: lokasiId } }),
      // Lokasi yang punya barang = yang perlu dicek
      prisma.lokasi.findMany({
        where: { id: lokasiId, barang: { some: {} } },
        orderBy: { nama: "asc" },
        select: { id: true, nama: true },
      }),
      // Lokasi yang sudah dicek bulan ini
      prisma.pengecekan.findMany({
        where: { tanggal: rentangBulan(sekarang), lokasiId },
        distinct: ["lokasiId"],
        select: { lokasiId: true },
      }),
      // Tanggal pengecekan terakhir tiap lokasi
      prisma.pengecekan.groupBy({ by: ["lokasiId"], where: { lokasiId }, _max: { tanggal: true } }),
      prisma.pengajuan.findMany({
        where: { lokasiId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, createdAt: true, lokasi: { select: { nama: true } }, items: { select: { nama: true } } },
      }),
      prisma.barangMasuk.findMany({
        where: lokasiId ? { items: { some: { barang: { lokasiId } } } } : undefined,
        orderBy: [{ tanggal: "desc" }, { id: "desc" }],
        take: 5,
        select: { id: true, tanggal: true, sumber: true, items: { select: { barang: { select: { nama: true } } } } },
      }),
      admin ? prisma.user.count({ where: { role: "USER", lokasiId: null } }) : Promise.resolve(0),
    ]);

  // Kondisi barang dari pengecekan terakhir tiap lokasi
  const isiCekTerakhir = cekTerakhir.length
    ? await prisma.pengecekan.findMany({
        where: { OR: cekTerakhir.map((c) => ({ lokasiId: c.lokasiId, tanggal: c._max.tanggal! })) },
        select: {
          tanggal: true,
          lokasiId: true,
          items: { select: { barangId: true, jumlahAda: true, rusakRingan: true, rusakBerat: true } },
        },
      })
    : [];
  const kondisi = await rekapKondisi(isiCekTerakhir);
  const totalKondisi = kondisi.baik + kondisi.kurang + kondisi.rusak + kondisi.hilang;
  const perluPerhatian = kondisi.kurang + kondisi.rusak + kondisi.hilang;

  // Progres pengecekan bulan ini
  const idSudah = new Set(sudahCek.map((c) => c.lokasiId));
  const belumDicek = lokasiPerluCek.filter((l) => !idSudah.has(l.id));
  const selesai = lokasiPerluCek.length - belumDicek.length;
  const persen = lokasiPerluCek.length ? Math.round((selesai / lokasiPerluCek.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Khusus admin: akun baru yang perlu dipasangkan lokasi */}
      {akunMenunggu > 0 && (
        <Link
          href="/admin/user"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 hover:bg-amber-100"
        >
          <b>{fmtAngka(akunMenunggu)} akun baru</b> menunggu dipasangkan ke lokasi. Atur di Kelola User →
        </Link>
      )}

      {/* Ringkasan */}
      <section className="rounded-3xl border border-green-100 bg-white/70 p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-800">Ringkasan</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KartuRingkas label="Jenis Barang" nilai={fmtAngka(jenisBarang)} ikon="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />
          <KartuRingkas label="Total Unit" nilai={fmtAngka(unit._sum.jumlah ?? 0)} ikon="M4 7h16M4 12h16M4 17h10" />
          <KartuRingkas
            label={admin ? "Lokasi" : "Lokasi Anda"}
            nilai={admin ? fmtAngka(jumlahLokasi) : (user.lokasi?.nama ?? "–")}
            ikon="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z"
          />
          <KartuRingkas
            label="Kurang Baik / Rusak / Hilang"
            nilai={fmtAngka(perluPerhatian)}
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
            {selesai} <span className="text-base font-semibold text-gray-400">/ {lokasiPerluCek.length} lokasi</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-green-600" style={{ width: `${persen}%` }} />
          </div>

          {belumDicek.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {belumDicek.map((l) => (
                <span key={l.id} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  {l.nama}
                </span>
              ))}
            </div>
          )}

          <Link
            href={`/admin/pengecekan/bulan/${kodeBulan(sekarang)}`}
            className="mt-auto pt-4 text-sm font-semibold text-green-700 hover:underline"
          >
            {belumDicek.length ? "Lanjutkan pengecekan →" : "Lihat hasil pengecekan →"}
          </Link>
        </section>

        {/* Kondisi barang (dari pengecekan terakhir tiap lokasi) */}
        <Panel judul="Kondisi Barang Terakhir" className="lg:col-span-2">
          {totalKondisi === 0 ? (
            <Kosong teks="Kondisi barang muncul setelah ada pengecekan." />
          ) : (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-gray-100">
                {KONDISI.map((k) => (
                  <div key={k.kunci} className={k.warna} style={{ width: `${(kondisi[k.kunci] / totalKondisi) * 100}%` }} />
                ))}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {KONDISI.map((k) => (
                  <div key={k.kunci} className="rounded-2xl border border-green-100 p-3">
                    <dt className="text-xs text-gray-500">{k.label}</dt>
                    <dd className={`text-2xl font-bold ${k.teks}`}>{fmtAngka(kondisi[k.kunci])}</dd>
                    <dd className="text-xs text-gray-400">{Math.round((kondisi[k.kunci] / totalKondisi) * 100)}%</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Barang masuk terbaru */}
        <Panel judul="Barang Masuk Terbaru" href="/admin/barang-masuk" className="min-h-56 lg:col-span-3">
          {barangMasuk.length === 0 ? (
            <Kosong teks="Belum ada barang masuk." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {barangMasuk.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">{ringkasNama(n.items.map((i) => i.barang.nama))}</p>
                    <p className="text-xs text-gray-500">{SUMBER_LABEL[n.sumber]}</p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-500">{fmtTanggalPendek(n.tanggal)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Pengajuan terbaru */}
        <Panel judul="Pengajuan Terbaru" href="/admin/pengajuan" className="min-h-56 lg:col-span-2">
          {pengajuan.length === 0 ? (
            <Kosong teks="Belum ada pengajuan." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {pengajuan.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">{ringkasNama(p.items.map((i) => i.nama))}</p>
                    {admin && <p className="text-xs text-gray-500">{p.lokasi.nama}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-gray-500">{fmtTanggalPendek(p.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}