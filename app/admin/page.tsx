import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rekapKondisi } from "@/lib/stok";
import { SUMBER_LABEL, fmtAngka, fmtBulan, fmtTanggalPendek, kodeBulan, rentangBulan } from "@/lib/format";

// Kartu angka ringkasan.
// HP: ikon di atas, angka di bawah (pas di 2 kolom). Desktop: ikon di samping.
// min-w-0 → kartu tidak pernah melebar melebihi kolomnya (tidak ada geser ke samping)
function KartuRingkas({
  label,
  nilai,
  ikon,
  keterangan,
  bahaya = false,
}: {
  label: string;
  nilai: string;
  ikon: string;
  keterangan?: string;
  bahaya?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 flex-col items-start gap-2 rounded-2xl border p-3 shadow-sm sm:flex-row sm:items-center sm:gap-4 sm:p-4 sm:shadow-none ${
        bahaya ? "border-red-200 bg-red-50" : "border-green-100 bg-white"
      }`}
    >
      <div
        className={`grid size-9 shrink-0 place-items-center rounded-xl sm:size-12 ${
          bahaya ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
        }`}
      >
        <svg viewBox="0 0 24 24" className="size-5 sm:size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d={ikon} />
        </svg>
      </div>
      <div className="w-full min-w-0">
        <p className="truncate text-xl font-bold text-gray-900 sm:text-2xl">{nilai}</p>
        <p className="truncate text-xs font-medium text-gray-600 sm:text-sm">{label}</p>
        {keterangan && <p className="truncate text-[11px] text-gray-400">{keterangan}</p>}
      </div>
    </div>
  );
}

// Judul bagian + link "Lihat semua" (dipakai di semua kartu supaya seragam)
function JudulBagian({ judul, sub, href }: { judul: string; sub?: string; href?: string }) {
  return (
    <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="truncate font-semibold capitalize text-gray-800">{judul}</h2>
        {sub && <p className="truncate text-xs text-gray-400">{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="shrink-0 py-0.5 text-sm font-semibold text-green-700 hover:underline">
          Lihat semua →
        </Link>
      )}
    </div>
  );
}

// Kartu putih. min-w-0 → tidak melebar di dalam grid
function Panel({
  judul,
  sub,
  href,
  className = "",
  children,
}: {
  judul: string;
  sub?: string;
  href?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`flex min-w-0 flex-col rounded-3xl border border-green-100 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      <JudulBagian judul={judul} sub={sub} href={href} />
      {children}
    </section>
  );
}

const Kosong = ({ teks }: { teks: string }) => (
  <p className="grid flex-1 place-items-center py-6 text-center text-sm text-gray-400">{teks}</p>
);

// Satu baris daftar (barang masuk / pengajuan) yang bisa ditekan
function BarisDaftar({ href, judul, sub, tanggal }: { href: string; judul: string; sub: string; tanggal: string }) {
  return (
    <li className="min-w-0">
      <Link
        href={href}
        className="flex min-w-0 items-center justify-between gap-3 rounded-xl px-2 py-2.5 text-sm hover:bg-green-50 active:bg-green-50"
      >
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">{judul}</p>
          <p className="truncate text-xs text-gray-500">{sub}</p>
        </div>
        <span className="shrink-0 text-xs text-gray-500">{tanggal}</span>
      </Link>
    </li>
  );
}

const KONDISI = [
  { kunci: "baik", label: "Baik", warna: "bg-green-600", teks: "text-green-700" },
  { kunci: "kurang", label: "Kurang Baik", warna: "bg-amber-500", teks: "text-amber-600" },
  { kunci: "rusak", label: "Rusak Berat", warna: "bg-red-600", teks: "text-red-600" },
  { kunci: "hilang", label: "Hilang", warna: "bg-gray-500", teks: "text-gray-700" },
] as const;

// Maksimal nama lokasi "belum dicek" yang ditampilkan
const MAKS_LOKASI = 6;

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
  const sisaLokasi = belumDicek.length - MAKS_LOKASI;

  return (
    // min-w-0 + w-full: seluruh isi dashboard pas selebar layar
    <div className="flex w-full min-w-0 flex-col gap-3 sm:gap-6">
      {/* Khusus admin: akun baru yang perlu dipasangkan lokasi */}
      {akunMenunggu > 0 && (
        <Link
          href="/admin/user"
          className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100 active:bg-amber-100 sm:px-5"
        >
          <span className="min-w-0 flex-1">
            <b>{fmtAngka(akunMenunggu)} akun baru</b> menunggu dipasangkan ke lokasi.
          </span>
          <span className="shrink-0 font-semibold">Atur →</span>
        </Link>
      )}

      {/* Ringkasan.
          HP: tanpa kotak luar, 4 kartu langsung 2×2. Desktop: di dalam kotak seperti semula */}
      <section className="min-w-0 sm:rounded-3xl sm:border sm:border-green-100 sm:bg-white/70 sm:p-5 sm:shadow-sm">
        <h2 className="mb-2 px-1 font-semibold text-gray-800 sm:mb-4 sm:px-0">Ringkasan</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <KartuRingkas label="Jenis Barang" nilai={fmtAngka(jenisBarang)} ikon="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />
          <KartuRingkas label="Total Unit" nilai={fmtAngka(unit._sum.jumlah ?? 0)} ikon="M4 7h16M4 12h16M4 17h10" />
          <KartuRingkas
            label={admin ? "Lokasi" : "Lokasi Anda"}
            nilai={admin ? fmtAngka(jumlahLokasi) : (user.lokasi?.nama ?? "–")}
            ikon="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z"
          />
          <KartuRingkas
            label="Perlu Perhatian"
            keterangan="Kurang baik, rusak, hilang"
            nilai={fmtAngka(perluPerhatian)}
            ikon="M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
            bahaya
          />
        </div>
      </section>

      <div className="grid min-w-0 gap-3 sm:gap-6 lg:grid-cols-3">
        {/* Progres pengecekan bulan ini */}
        <section className="flex min-w-0 flex-col rounded-3xl border border-green-100 bg-white p-4 shadow-sm sm:p-5">
          <JudulBagian judul={`Pengecekan ${fmtBulan(sekarang)}`} />

          <div className="flex items-end justify-between gap-3">
            <p className="text-3xl font-bold text-gray-900">
              {selesai} <span className="text-base font-semibold text-gray-400">/ {lokasiPerluCek.length} lokasi</span>
            </p>
            <span className={`shrink-0 pb-1 text-sm font-semibold ${persen === 100 ? "text-green-700" : "text-gray-500"}`}>
              {persen}% selesai
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-green-600" style={{ width: `${persen}%` }} />
          </div>

          {belumDicek.length > 0 ? (
            <div className="mt-4 min-w-0">
              <p className="mb-1.5 text-xs font-medium text-gray-500">Belum dicek:</p>
              <div className="flex flex-wrap gap-1.5">
                {belumDicek.slice(0, MAKS_LOKASI).map((l) => (
                  <span
                    key={l.id}
                    className="max-w-full truncate rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
                  >
                    {l.nama}
                  </span>
                ))}
                {sisaLokasi > 0 && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                    +{sisaLokasi} lainnya
                  </span>
                )}
              </div>
            </div>
          ) : (
            lokasiPerluCek.length > 0 && (
              <p className="mt-4 text-sm font-medium text-green-700">Semua lokasi sudah dicek bulan ini.</p>
            )
          )}

          {/* HP: tombol hijau lebar penuh (mudah ditekan). Desktop: link biasa */}
          <div className="mt-auto pt-4">
            <Link
              href={`/admin/pengecekan/bulan/${kodeBulan(sekarang)}`}
              className="block rounded-xl bg-green-700 py-2.5 text-center text-sm font-semibold text-white active:bg-green-800 sm:inline sm:rounded-none sm:bg-transparent sm:p-0 sm:text-left sm:text-green-700 sm:hover:underline"
            >
              {belumDicek.length ? "Lanjutkan pengecekan →" : "Lihat hasil pengecekan →"}
            </Link>
          </div>
        </section>

        {/* Kondisi barang (dari pengecekan terakhir tiap lokasi) */}
        <Panel judul="Kondisi Barang Terakhir" sub="Dari pengecekan terakhir tiap lokasi" className="lg:col-span-2">
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
                  <div key={k.kunci} className="min-w-0 rounded-2xl border border-green-100 p-3">
                    <dt className="flex min-w-0 items-center gap-1.5 text-xs text-gray-500">
                      {/* Titik warna = warna yang sama di bar atas */}
                      <span className={`size-2 shrink-0 rounded-full ${k.warna}`} />
                      <span className="truncate">{k.label}</span>
                    </dt>
                    <dd className={`text-xl font-bold sm:text-2xl ${k.teks}`}>{fmtAngka(kondisi[k.kunci])}</dd>
                    <dd className="text-xs text-gray-400">{Math.round((kondisi[k.kunci] / totalKondisi) * 100)}% unit</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </Panel>
      </div>

      <div className="grid min-w-0 gap-3 sm:gap-6 lg:grid-cols-5">
        {/* Barang masuk terbaru */}
        <Panel judul="Barang Masuk Terbaru" href="/admin/barang-masuk" className="lg:col-span-3 lg:min-h-56">
          {barangMasuk.length === 0 ? (
            <Kosong teks="Belum ada barang masuk." />
          ) : (
            <ul className="-mx-2 divide-y divide-gray-100">
              {barangMasuk.map((n) => (
                <BarisDaftar
                  key={n.id}
                  href={`/admin/barang-masuk/${n.id}`}
                  judul={ringkasNama(n.items.map((i) => i.barang.nama))}
                  sub={`${SUMBER_LABEL[n.sumber]} · ${n.items.length} barang`}
                  tanggal={fmtTanggalPendek(n.tanggal)}
                />
              ))}
            </ul>
          )}
        </Panel>

        {/* Pengajuan terbaru */}
        <Panel judul="Pengajuan Terbaru" href="/admin/pengajuan" className="lg:col-span-2 lg:min-h-56">
          {pengajuan.length === 0 ? (
            <Kosong teks="Belum ada pengajuan." />
          ) : (
            <ul className="-mx-2 divide-y divide-gray-100">
              {pengajuan.map((p) => (
                <BarisDaftar
                  key={p.id}
                  href="/admin/pengajuan"
                  judul={ringkasNama(p.items.map((i) => i.nama))}
                  sub={admin ? `${p.lokasi.nama} · ${p.items.length} barang` : `${p.items.length} barang`}
                  tanggal={fmtTanggalPendek(p.createdAt)}
                />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}