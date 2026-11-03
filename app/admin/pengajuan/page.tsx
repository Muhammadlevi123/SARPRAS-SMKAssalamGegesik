import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import PengajuanForm from "@/components/admin/pengajuan/PengajuanForm";
import TabelPengajuan, { type BarisPengajuan } from "@/components/admin/pengajuan/TabelPengajuan";
import { fmtTanggal } from "@/lib/format";

const fmtJam = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

export default async function PengajuanPage() {
  const user = await requireUser();
  const admin = user.role === "ADMIN";

  // USER yang belum dipasangkan lokasi oleh admin
  if (!admin && !user.lokasi) {
    return (
      <div>
        <PageHeader judul="Pengajuan" deskripsi="Ajukan barang yang dibutuhkan untuk lokasi Anda." />
        <EmptyState
          judul="Akun belum ditetapkan ke lokasi"
          pesan="Pengajuan dibuat untuk lokasi tanggung jawab Anda. Hubungi admin untuk memasangkan akun ini ke lokasi."
        />
      </div>
    );
  }

  const daftar = await prisma.pengajuan.findMany({
    // ADMIN: semua lokasi. USER: hanya lokasinya sendiri
    where: admin ? undefined : { lokasiId: user.lokasi!.id },
    orderBy: { createdAt: "desc" },
    include: {
      lokasi: { select: { nama: true } },
      user: { select: { id: true, nama: true } },
      items: { orderBy: { id: "asc" }, select: { id: true, nama: true, merk: true, jumlah: true, satuan: true } },
    },
  });

  // Data siap tampil (tanggal sudah jadi teks, supaya aman dikirim ke komponen client)
  const data: BarisPengajuan[] = daftar.map((p) => ({
    id: p.id,
    tanggal: `${fmtTanggal(p.createdAt)}, ${fmtJam.format(p.createdAt)} WIB`,
    lokasi: p.lokasi.nama,
    pengaju: p.user?.nama ?? "Akun dihapus",
    alasan: p.alasan,
    items: p.items,
    // ADMIN boleh hapus semua, USER hanya miliknya
    bisaHapus: admin || p.user?.id === user.id,
  }));

  return (
    <div>
      <PageHeader
        judul="Pengajuan"
        deskripsi={admin ? "Pengajuan barang dari semua lokasi." : `Pengajuan barang untuk ${user.lokasi!.nama}.`}
        aksi={admin ? undefined : <PengajuanForm namaLokasi={user.lokasi!.nama} />}
      />

      {data.length === 0 ? (
        <EmptyState
          judul="Belum ada pengajuan"
          pesan={admin ? "Pengajuan dari user akan muncul di sini." : "Klik tombol Buat Pengajuan untuk mengajukan barang yang dibutuhkan."}
        />
      ) : (
        <TabelPengajuan data={data} tampilLokasi={admin} />
      )}
    </div>
  );
}