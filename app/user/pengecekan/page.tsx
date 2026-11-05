import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePengguna } from "@/lib/auth";
import { rekapKondisi, type RekapKondisi } from "@/lib/stok";
import { daftarTahunAjaran, rentangTahunAjaran, tahunAjaranAktif } from "@/lib/periode";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import SelectFilter from "@/components/admin/SelectFilter";
import { btnPrimary, btnSecondary } from "@/components/admin/ui";
import { fmtAngka, fmtBulan, fmtTanggalPendek, kodeBulan, parseBulan, rentangBulan } from "@/lib/format";

export default async function PengecekanUserPage({ searchParams }: { searchParams: Promise<{ ta?: string }> }) {
  const user = await requirePengguna();
  const lokasiId = user.lokasi.id;

  const sp = await searchParams;
  const [daftarTA, aktif] = await Promise.all([daftarTahunAjaran(), tahunAjaranAktif()]);

  if (daftarTA.length === 0) {
    return (
      <div className="min-w-0">
        <PageHeader judul="Pengecekan" deskripsi={`Pengecekan barang di ${user.lokasi.nama}.`} />
        <EmptyState judul="Belum ada tahun ajaran" pesan="Hubungi admin untuk menambahkan tahun ajaran." />
      </div>
    );
  }

  // Tahun ajaran terpilih: dari URL (?ta=3) → yang sedang aktif → yang terbaru
  const ta = daftarTA.find((t) => t.id === Number(sp.ta)) ?? aktif ?? daftarTA[0];
  const rentang = await rentangTahunAjaran(ta.id);

  const [periodeList, cekList, jumlahBarang] = await Promise.all([
    // Bulan yang dibuka admin di tahun ajaran ini
    prisma.periodePengecekan.findMany({
      where: { bulan: { gte: rentangBulan(ta.mulai).gte, lt: rentang.lt } },
      select: { bulan: true },
    }),
    // Pengecekan lokasi ini di tahun ajaran ini
    prisma.pengecekan.findMany({
      where: { lokasiId, tanggal: rentang },
      select: {
        tanggal: true,
        petugas: true,
        lokasiId: true,
        items: { select: { barangId: true, jumlahAda: true, rusakRingan: true, rusakBerat: true } },
      },
    }),
    prisma.barang.count({ where: { lokasiId } }),
  ]);

  // Bulan yang tampil: dibuka admin + yang sudah berisi pengecekan. Terbaru di atas.
  const cekPerBulan = new Map(cekList.map((c) => [kodeBulan(c.tanggal), c]));
  const daftarKode = [...new Set([...periodeList.map((p) => kodeBulan(p.bulan)), ...cekPerBulan.keys()])].sort(
    (a, b) => b.localeCompare(a)
  );

  const rekapPerBulan = new Map<string, RekapKondisi>();
  for (const [kode, cek] of cekPerBulan) rekapPerBulan.set(kode, await rekapKondisi([cek]));

  const kodeIni = kodeBulan(new Date());
  const selesai = daftarKode.filter((k) => cekPerBulan.has(k)).length;

  return (
    <div className="min-w-0">
      <PageHeader judul="Pengecekan" deskripsi={`Pengecekan barang di ${user.lokasi.nama} setiap bulan.`} />

      {/* Pilih tahun ajaran */}
      <form className="relative z-20 mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:contents">
          <div className="min-w-0 sm:w-72">
            <SelectFilter
              name="ta"
              label="Tahun ajaran"
              defaultValue={String(ta.id)}
              opsi={daftarTA.map((t) => ({
                value: String(t.id),
                label: `Tahun Ajaran ${t.nama}${t.id === aktif?.id ? " (aktif)" : ""}`,
              }))}
              className="w-full"
            />
          </div>
          <button type="submit" className={`${btnSecondary} justify-center`}>
            Tampilkan
          </button>
        </div>
        <p className="px-1 text-xs text-gray-500 sm:px-0 sm:text-sm">
          {fmtTanggalPendek(ta.mulai)} – {fmtTanggalPendek(ta.selesai)}
        </p>
      </form>

      {jumlahBarang === 0 ? (
        <EmptyState judul="Belum ada barang di lokasi Anda" pesan="Barang akan muncul setelah admin mencatat barang masuk." />
      ) : daftarKode.length === 0 ? (
        <EmptyState
          judul={`Belum ada pengecekan di tahun ajaran ${ta.nama}`}
          pesan="Admin belum membuka bulan pengecekan. Bulan akan muncul di sini setelah ditambahkan admin."
        />
      ) : (
        <>
          {/* Progres tahun ajaran */}
          <section className="mb-4 rounded-3xl border border-green-100 bg-white p-4 shadow-sm">
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-gray-500">Bulan sudah dicek</span>
              <b className="text-gray-900">
                {selesai} / {daftarKode.length}
              </b>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-green-600"
                style={{ width: `${Math.round((selesai / daftarKode.length) * 100)}%` }}
              />
            </div>
          </section>

          {/* Kartu per bulan */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
            {daftarKode.map((kode) => {
              const cek = cekPerBulan.get(kode);
              const rekap = rekapPerBulan.get(kode);
              const namaBulan = fmtBulan(parseBulan(kode)!);

              return (
                <div
                  key={kode}
                  className={`flex min-w-0 flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm ${
                    cek ? "border-green-200" : "border-gray-200"
                  }`}
                >
                  {/* Bulan */}
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-green-100 text-green-700">
                      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                        <path d="M4 10h16" />
                        <path d="M8 3v4" />
                        <path d="M16 3v4" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold capitalize text-gray-900">{namaBulan}</p>
                      {kode === kodeIni && <p className="text-xs font-semibold text-green-700">Bulan berjalan</p>}
                    </div>
                  </div>

                  {/* Status */}
                  {cek && rekap ? (
                    <>
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold text-green-700">✓ Dicek {fmtTanggalPendek(cek.tanggal)}</span> ·{" "}
                        {cek.petugas}
                      </p>
                      <dl className="grid grid-cols-4 gap-1.5 text-center">
                        {[
                          { label: "Baik", nilai: rekap.baik, cls: "bg-green-50 text-green-700" },
                          { label: "Kurang", nilai: rekap.kurang, cls: "bg-amber-50 text-amber-700" },
                          { label: "Rusak", nilai: rekap.rusak, cls: "bg-red-50 text-red-700" },
                          { label: "Hilang", nilai: rekap.hilang, cls: "bg-gray-100 text-gray-700" },
                        ].map((k) => (
                          <div key={k.label} className={`min-w-0 rounded-xl px-1 py-2 ${k.cls}`}>
                            <dd className="truncate text-base font-bold">{fmtAngka(k.nilai)}</dd>
                            <dt className="text-[10px] font-semibold">{k.label}</dt>
                          </div>
                        ))}
                      </dl>
                    </>
                  ) : (
                    <span className="w-fit rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      Belum dicek
                    </span>
                  )}

                  <Link
                    href={`/user/pengecekan/${kode}`}
                    className={`mt-auto ${cek ? btnSecondary : btnPrimary} h-11 justify-center`}
                  >
                    {cek ? "Lihat / Edit" : "Mulai cek"}
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}