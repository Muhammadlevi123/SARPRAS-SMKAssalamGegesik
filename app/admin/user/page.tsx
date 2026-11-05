import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import SelectFilter from "@/components/admin/SelectFilter";
import TombolHapus from "@/components/admin/TombolHapus";
import AturLokasi from "@/components/admin/user/AturLokasi";
import { btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/admin/ui";
import { ROLE_LABEL, isRole } from "@/lib/role";
import { fmtTanggal } from "@/lib/format";
import { hapusUser } from "./actions";

const MENUNGGU = "menunggu"; // nilai filter lokasi untuk akun yang belum dipasangkan

export default async function UserPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; lokasi?: string }>;
}) {
  const saya = await requireAdmin(); // khusus Admin

  // ===== Baca filter dari URL =====
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const role = sp.role && isRole(sp.role) ? sp.role : undefined;
  const filterLokasi = sp.lokasi === MENUNGGU ? MENUNGGU : Number(sp.lokasi) || 0;
  const adaFilter = Boolean(q || role || filterLokasi);

  const where = {
    role,
    // "Menunggu lokasi" = USER yang lokasinya belum ditetapkan
    ...(filterLokasi === MENUNGGU
      ? { role: "USER" as const, lokasiId: null }
      : filterLokasi
        ? { lokasiId: filterLokasi }
        : {}),
    OR: q ? [{ nama: { contains: q } }, { email: { contains: q } }] : undefined,
  };

  const [daftar, lokasi, jumlahMenunggu] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ role: "asc" }, { nama: "asc" }],
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        createdAt: true,
        lokasi: { select: { id: true, nama: true } },
      },
    }),
    prisma.lokasi.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
    prisma.user.count({ where: { role: "USER", lokasiId: null } }),
  ]);

  // USER yang belum punya lokasi ditaruh paling atas (perlu diatur admin)
  const menunggu = (u: (typeof daftar)[number]) => u.role === "USER" && !u.lokasi;
  const urut = [...daftar].sort((a, b) => Number(menunggu(b)) - Number(menunggu(a)));

  // Badge role (dipakai di kartu HP & tabel desktop)
  const BadgeRole = ({ admin, label }: { admin: boolean; label: string }) => (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
        admin ? "bg-green-100 text-green-700" : "bg-blue-50 text-blue-700"
      }`}
    >
      {label}
    </span>
  );

  return (
    <div className="min-w-0">
      <PageHeader
        judul="Kelola User"
        deskripsi={
          jumlahMenunggu
            ? `${jumlahMenunggu} akun baru menunggu dipasangkan ke lokasi.`
            : "Akun yang terdaftar di aplikasi SARPRAS beserta lokasi tanggung jawabnya."
        }
      />

      {/* ===== Pencarian & Filter =====
          HP     : kartu dengan judul, kolom tersusun ke bawah + label
          Desktop: satu baris tanpa kartu (seperti semula)
          relative z-20 & tanpa overflow-hidden → dropdown tidak terpotong */}
      <form
        key={`${q}|${role}|${filterLokasi}`}
        className="relative z-20 mb-4 rounded-3xl border border-green-100 bg-white shadow-sm md:rounded-none md:border-0 md:bg-transparent md:shadow-none"
      >
        <div className="flex items-center gap-2 rounded-t-3xl border-b border-green-100 bg-green-50/60 px-4 py-3 md:hidden">
          <svg viewBox="0 0 24 24" className="size-5 text-green-700" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 4h18l-7 8.5V19l-4 2v-8.5L3 4z" />
          </svg>
          <h2 className="font-semibold text-gray-900">Pencarian &amp; Filter</h2>
        </div>

        <div className="flex flex-col gap-4 p-4 md:flex-row md:flex-wrap md:items-center md:gap-3 md:p-0">
          {/* Cari */}
          <div className="flex flex-col gap-2 md:w-full md:max-w-xs">
            <p className={`${labelClass} md:hidden`}>Cari User</p>
            <div className="relative">
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Cari nama atau email..."
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>

          {/* Role */}
          <div className="flex flex-col gap-2">
            <p className={`${labelClass} md:hidden`}>Role</p>
            <SelectFilter
              name="role"
              label="Filter role"
              defaultValue={role ?? ""}
              opsi={[
                { value: "", label: "Semua role" },
                { value: "ADMIN", label: ROLE_LABEL.ADMIN },
                { value: "USER", label: ROLE_LABEL.USER },
              ]}
              className="w-full md:w-40"
            />
          </div>

          {/* Lokasi */}
          <div className="flex flex-col gap-2">
            <p className={`${labelClass} md:hidden`}>Lokasi</p>
            <SelectFilter
              name="lokasi"
              label="Filter lokasi"
              defaultValue={filterLokasi ? String(filterLokasi) : ""}
              opsi={[
                { value: "", label: "Semua lokasi" },
                { value: MENUNGGU, label: `Menunggu lokasi (${jumlahMenunggu})` },
                ...lokasi.map((l) => ({ value: String(l.id), label: l.nama })),
              ]}
              bisaCari
              className="w-full md:w-56"
            />
          </div>

          {/* Tombol: HP lebar penuh, desktop di samping */}
          <div className={`grid gap-2 md:flex md:gap-3 ${adaFilter ? "grid-cols-2" : "grid-cols-1"}`}>
            <button type="submit" className={`${btnPrimary} justify-center md:hidden`}>
              Terapkan
            </button>
            <div className="hidden md:block">
              <button type="submit" className={btnSecondary}>
                Terapkan
              </button>
            </div>
            {adaFilter && (
              <Link href="/admin/user" className={`${btnSecondary} justify-center`}>
                Reset
              </Link>
            )}
          </div>
        </div>
      </form>

      {urut.length === 0 ? (
        <EmptyState
          judul={adaFilter ? "Tidak ada user untuk filter ini" : "Belum ada user"}
          pesan={adaFilter ? "Coba ubah kata kunci atau filter." : "Akun baru akan muncul di sini setelah mendaftar."}
        />
      ) : (
        <>
          {/* ===== HP: daftar kartu ===== */}
          <section className="min-w-0 overflow-hidden rounded-3xl border border-green-100 bg-white shadow-sm md:hidden">
            <div className="border-b border-green-100 bg-green-50/60 px-4 py-3">
              <p className="font-semibold text-gray-900">{urut.length} user</p>
              <p className="text-xs text-gray-500">
                {jumlahMenunggu ? `${jumlahMenunggu} menunggu lokasi (ditaruh paling atas)` : "Semua akun sudah punya lokasi"}
              </p>
            </div>

            <ul className="divide-y divide-gray-100">
              {urut.map((u) => {
                const sayaSendiri = u.id === saya.id;
                const admin = u.role === "ADMIN";
                const tunggu = menunggu(u);
                const adaAksi = !admin || !sayaSendiri;

                return (
                  <li key={u.id} className={`min-w-0 p-4 ${tunggu ? "bg-amber-50/50" : ""}`}>
                    {/* Inisial + nama + email + role */}
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${
                          tunggu ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                        }`}
                      >
                        {u.nama.trim().charAt(0).toUpperCase() || "?"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate text-base font-bold text-gray-900">{u.nama}</span>
                          {sayaSendiri && (
                            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                              ANDA
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-gray-500">{u.email}</p>
                      </div>
                      <BadgeRole admin={admin} label={ROLE_LABEL[u.role]} />
                    </div>

                    {/* Kotak info */}
                    <dl className="mt-3 grid grid-cols-2 gap-3 rounded-2xl bg-white/80 p-3 ring-1 ring-green-100">
                      <div className="min-w-0">
                        <dt className="text-xs text-gray-500">Lokasi</dt>
                        <dd className="mt-0.5 min-w-0">
                          {admin ? (
                            <span className="text-sm text-gray-400">–</span>
                          ) : u.lokasi ? (
                            <span className="block truncate text-sm font-semibold text-gray-800">{u.lokasi.nama}</span>
                          ) : (
                            <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                              Menunggu
                            </span>
                          )}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs text-gray-500">Terdaftar</dt>
                        <dd className="mt-0.5 text-sm font-semibold text-gray-800">{fmtTanggal(u.createdAt)}</dd>
                      </div>
                    </dl>

                    {/* Aksi: Atur Lokasi lebar (khusus USER) + Hapus (bukan akun sendiri) */}
                    {adaAksi && (
                      <div
                        className={`mt-3 grid gap-2 ${
                          !admin && !sayaSendiri ? "grid-cols-[1fr_auto]" : admin ? "grid-cols-[auto] justify-end" : "grid-cols-1"
                        }`}
                      >
                        {!admin && (
                          <AturLokasi
                            tampilan="kartu"
                            id={u.id}
                            nama={u.nama}
                            lokasiId={u.lokasi?.id ?? null}
                            lokasi={lokasi}
                          />
                        )}
                        {!sayaSendiri && (
                          <div className="grid place-items-center rounded-xl border border-red-200 bg-red-50 px-1">
                            <TombolHapus action={hapusUser} id={u.id} nama={`User ${u.nama}`} />
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ===== Desktop: tabel seperti semula ===== */}
          <div className="hidden overflow-x-auto rounded-3xl border border-green-100 bg-white shadow-sm md:block">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-green-100 bg-green-50/60 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Nama</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Lokasi</th>
                  <th className="px-5 py-3 font-semibold">Terdaftar</th>
                  <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {urut.map((u) => {
                  const sayaSendiri = u.id === saya.id;
                  const admin = u.role === "ADMIN";

                  return (
                    <tr key={u.id} className={menunggu(u) ? "bg-amber-50/40" : undefined}>
                      <td className="px-5 py-3 font-semibold text-gray-900">
                        {u.nama}
                        {sayaSendiri && (
                          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">ANDA</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{u.email}</td>
                      <td className="px-5 py-3">
                        <BadgeRole admin={admin} label={ROLE_LABEL[u.role]} />
                      </td>
                      <td className="px-5 py-3">
                        {admin ? (
                          <span className="text-gray-400">–</span>
                        ) : u.lokasi ? (
                          <span className="text-gray-800">{u.lokasi.nama}</span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                            Menunggu lokasi
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{fmtTanggal(u.createdAt)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Lokasi hanya untuk USER */}
                          {!admin && (
                            <AturLokasi id={u.id} nama={u.nama} lokasiId={u.lokasi?.id ?? null} lokasi={lokasi} />
                          )}
                          {/* Akun sendiri tidak bisa dihapus */}
                          {!sayaSendiri && <TombolHapus action={hapusUser} id={u.id} nama={`User ${u.nama}`} />}
                        </div>
                      </td>
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