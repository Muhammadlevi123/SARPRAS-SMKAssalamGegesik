import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import BarangMasukForm from "@/components/admin/barang-masuk/BarangMasukForm";
import { btnPrimary } from "@/components/admin/ui";
import { bacaBiayaLain, hariIniInput } from "@/lib/format";

export default async function TambahBarangMasukPage() {
  await requireUser();

  const [barang, lokasiList, mitraList, kategoriList, satuanRows, merkRows, notaBeli] = await Promise.all([
    prisma.barang.findMany({
      include: { lokasi: { select: { nama: true } } },
      orderBy: [{ nama: "asc" }, { lokasi: { nama: "asc" } }],
    }),
    prisma.lokasi.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
    prisma.mitra.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
    // Kategori + kodenya (untuk pilihan & pratinjau kode barang baru)
    prisma.kategori.findMany({ orderBy: { nama: "asc" }, select: { nama: true, kode: true, noTerakhir: true } }),
    prisma.barang.findMany({ distinct: ["satuan"], select: { satuan: true }, orderBy: { satuan: "asc" } }),
    prisma.barang.findMany({
      where: { merk: { not: null } },
      distinct: ["merk"],
      select: { merk: true },
      orderBy: { merk: "asc" },
    }),
    // Nama biaya lain-lain yang pernah dipakai (dari 200 nota pembelian terakhir)
    prisma.barangMasuk.findMany({
      where: { sumber: "PEMBELIAN" },
      select: { biayaLain: true },
      orderBy: { id: "desc" },
      take: 200,
    }),
  ]);

  const namaBiayaList = Array.from(
    new Set(notaBeli.flatMap((n) => bacaBiayaLain(n.biayaLain).map((b) => b.nama)))
  ).sort((a, b) => a.localeCompare(b, "id"));

  return (
    <div>
      <PageHeader
        judul="Catat Barang Masuk"
        deskripsi="Satu nota bisa berisi banyak barang. Barang baru otomatis ditambahkan ke daftar Barang beserta kodenya."
      />

      {lokasiList.length === 0 ? (
        <EmptyState judul="Belum ada lokasi" pesan="Setiap barang harus punya lokasi. Tambahkan lokasi terlebih dahulu.">
          <Link href="/admin/lokasi" className={btnPrimary}>Ke halaman Lokasi</Link>
        </EmptyState>
      ) : (
        <BarangMasukForm
          barangList={barang.map((b) => ({
            id: b.id,
            kode: b.kode,
            nama: b.nama,
            merk: b.merk,
            satuan: b.satuan,
            lokasi: b.lokasi.nama,
          }))}
          lokasiList={lokasiList}
          mitraList={mitraList}
          kategoriList={kategoriList}
          satuanList={satuanRows.map((s) => s.satuan)}
          merkList={merkRows.map((m) => m.merk).filter((m): m is string => !!m)}
          namaBiayaList={namaBiayaList}
          hariIni={hariIniInput()}
        />
      )}
    </div>
  );
}