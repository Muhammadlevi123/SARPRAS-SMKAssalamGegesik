    import { prisma } from "@/lib/prisma";
    import { requireUser } from "@/lib/auth";
    import { tahunAjaranAktif } from "@/lib/periode";
    import PageHeader from "@/components/admin/PageHeader";
    import EmptyState from "@/components/admin/EmptyState";
    import TombolHapus from "@/components/admin/TombolHapus";
    import TahunAjaranForm from "@/components/admin/pengaturan/TahunAjaranForm";
    import GantiPasswordForm from "@/components/admin/pengaturan/GantiPasswordForm";
    import { fmtTanggal, tanggalInput } from "@/lib/format";
    import { hapusTahunAjaran } from "./actions";

    const SEHARI = 24 * 60 * 60 * 1000;

    export default async function PengaturanPage() {
    await requireUser();

    const [urut, aktif] = await Promise.all([
        prisma.tahunAjaran.findMany({ orderBy: { mulai: "asc" } }),
        tahunAjaranAktif(),
    ]);

    // Tanggal berakhir = sehari sebelum tahun ajaran berikutnya mulai
    const daftar = urut
        .map((ta, i) => ({
        ...ta,
        sampai: urut[i + 1] ? new Date(urut[i + 1].mulai.getTime() - SEHARI) : null,
        }))
        .reverse(); // tampilkan yang terbaru di atas

    return (
        <div>
        <PageHeader judul="Pengaturan" deskripsi="Tahun ajaran dan akun admin." />

        <div className="grid gap-6 xl:grid-cols-3">
            {/* Tahun Ajaran */}
            <section className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                <h3 className="font-semibold text-gray-900">Tahun Ajaran</h3>
                <p className="text-sm text-gray-500">Dipakai untuk filter laporan per tahun ajaran.</p>
                </div>
                <TahunAjaranForm />
            </div>

            {daftar.length === 0 ? (
                <EmptyState
                judul="Belum ada tahun ajaran"
                pesan="Tambahkan tahun ajaran yang sedang berjalan beserta tanggal mulainya."
                />
            ) : (
                <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="border-b border-green-100 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                        <th className="px-3 py-2 font-semibold">Tahun Ajaran</th>
                        <th className="px-3 py-2 font-semibold">Mulai</th>
                        <th className="px-3 py-2 font-semibold">Berakhir</th>
                        <th className="px-3 py-2 text-right font-semibold">Aksi</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                    {daftar.map((ta) => (
                        <tr key={ta.id}>
                        <td className="px-3 py-3 font-semibold text-gray-900">
                            {ta.nama}
                            {aktif?.id === ta.id && (
                            <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                                AKTIF
                            </span>
                            )}
                        </td>
                        <td className="px-3 py-3 text-gray-600">{fmtTanggal(ta.mulai)}</td>
                        <td className="px-3 py-3 text-gray-600">{ta.sampai ? fmtTanggal(ta.sampai) : "Sampai sekarang"}</td>
                        <td className="px-3 py-3">
                            <div className="flex items-start justify-end gap-1">
                            <TahunAjaranForm data={{ id: ta.id, nama: ta.nama, mulai: tanggalInput(ta.mulai) }} />
                            <TombolHapus action={hapusTahunAjaran} id={ta.id} nama={`Tahun ajaran ${ta.nama}`} />
                            </div>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            )}
            </section>

            {/* Ganti Password */}
            <section className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900">Ganti Password</h3>
            <p className="mb-4 text-sm text-gray-500">Minimal 8 karakter.</p>
            <GantiPasswordForm />
            </section>
        </div>
        </div>
    );
    }