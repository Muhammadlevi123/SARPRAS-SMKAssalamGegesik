import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import SelectFilter from "@/components/admin/SelectFilter";
import TombolHapus from "@/components/admin/TombolHapus";
import AturLokasi from "@/components/admin/user/AturLokasi";
import { btnSecondary, inputClass } from "@/components/admin/ui";
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

  return (
    <div>
      <PageHeader
        judul="Kelola User"
        deskripsi={
          jumlahMenunggu
            ? `${jumlahMenunggu} akun baru menunggu dipasangkan ke lokasi.`
            : "Akun yang terdaftar di aplikasi SARPRAS beserta lokasi tanggung jawabnya."
        }
      />

      {/* ===== Cari & filter ===== */}
      <form key={`${q}|${role}|${filterLokasi}`} className="mb-4 flex flex-wrap gap-3">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Cari nama atau email..."
          className={`${inputClass} sm:max-w-xs`}
        />
        <SelectFilter
          name="role"
          label="Filter role"
          defaultValue={role ?? ""}
          opsi={[
            { value: "", label: "Semua role" },
            { value: "ADMIN", label: ROLE_LABEL.ADMIN },
            { value: "USER", label: ROLE_LABEL.USER },
          ]}
          className="w-full sm:w-40"
        />
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
          className="w-full sm:w-56"
        />
        <button type="submit" className={btnSecondary}>Terapkan</button>
        {adaFilter && <Link href="/admin/user" className={btnSecondary}>Reset</Link>}
      </form>

      {/* ===== Tabel ===== */}
      {urut.length === 0 ? (
        <EmptyState
          judul={adaFilter ? "Tidak ada user untuk filter ini" : "Belum ada user"}
          pesan={adaFilter ? "Coba ubah kata kunci atau filter." : "Akun baru akan muncul di sini setelah mendaftar."}
        />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-green-100 bg-white shadow-sm">
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
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          admin ? "bg-green-100 text-green-700" : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {ROLE_LABEL[u.role]}
                      </span>
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
      )}
    </div>
  );
}