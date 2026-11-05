import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePengguna } from "@/lib/auth";
import { stokSampai } from "@/lib/stok";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import PengecekanForm from "@/components/admin/pengecekan/PengecekanForm";
import { btnSecondary } from "@/components/admin/ui";
import { fmtBulan, hariIniInput, kodeBulan, parseBulan, rentangBulan, tanggalInput } from "@/lib/format";

const SEHARI = 24 * 60 * 60 * 1000;

export default async function CekLokasiUserPage({ params }: { params: Promise<{ kode: string }> }) {
  const user = await requirePengguna();
  const lokasiId = user.lokasi.id; // selalu lokasi milik user, tidak bisa diganti dari URL

  const awal = parseBulan((await params).kode);
  if (!awal) notFound();

  const sekarang = new Date();
  const rentang = rentangBulan(awal);
  const kode = kodeBulan(awal);
  const akhirBulan = new Date(rentang.lt.getTime() - SEHARI);

  const [periode, barang, ada, ta] = await Promise.all([
    prisma.periodePengecekan.findFirst({ where: { bulan: rentang }, select: { id: true } }),
    prisma.barang.findMany({
      where: { lokasiId },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, merk: true, kode: true, satuan: true },
    }),
    // Pengecekan lokasi ini di bulan ini (kalau sudah ada → mode edit)
    prisma.pengecekan.findFirst({ where: { lokasiId, tanggal: rentang }, include: { items: true } }),
    // Tahun ajaran bulan ini (untuk tombol Kembali)
    prisma.tahunAjaran.findFirst({
      where: { mulai: { lt: rentang.lt }, selesai: { gte: rentang.gte } },
      select: { id: true },
    }),
  ]);

  // Bulan yang belum dibuka admin & belum pernah dicek → tidak bisa dibuka
  if (!periode && !ada) notFound();

  const kembali = ta ? `/user/pengecekan?ta=${ta.id}` : "/user/pengecekan";

  // Jumlah seharusnya dihitung sampai tanggal pengecekan (atau hari ini / akhir bulan)
  const acuan = ada?.tanggal ?? (rentang.lt < sekarang ? new Date(rentang.lt.getTime() - 1) : sekarang);

  const [stok, sebelumnya] = await Promise.all([
    stokSampai(acuan),
    // Pengecekan bulan sebelumnya, dipakai sebagai nilai awal
    ada
      ? Promise.resolve(null)
      : prisma.pengecekan.findFirst({
          where: { lokasiId, tanggal: { lt: rentang.gte } },
          orderBy: { tanggal: "desc" },
          include: { items: true },
        }),
  ]);

  const itemAda = new Map((ada?.items ?? []).map((i) => [i.barangId, i]));
  const itemLalu = new Map((sebelumnya?.items ?? []).map((i) => [i.barangId, i]));

  const daftar = barang.map((b) => {
    const seharusnya = stok.get(b.id) ?? 0;
    const tersimpan = itemAda.get(b.id);

    // Mode edit: pakai data yang sudah tersimpan
    if (tersimpan) {
      return {
        ...b,
        seharusnya,
        baik: tersimpan.jumlahAda - tersimpan.rusakRingan - tersimpan.rusakBerat,
        kurang: tersimpan.rusakRingan,
        rusak: tersimpan.rusakBerat,
        ket: tersimpan.keterangan ?? "",
      };
    }

    // Pengecekan baru: bawa kondisi bulan lalu, sisanya dianggap baik
    const lalu = itemLalu.get(b.id);
    const kurang = Math.min(lalu?.rusakRingan ?? 0, seharusnya);
    const rusak = Math.min(lalu?.rusakBerat ?? 0, seharusnya - kurang);
    return { ...b, seharusnya, baik: seharusnya - kurang - rusak, kurang, rusak, ket: "" };
  });

  const tanggalAwal = ada
    ? tanggalInput(ada.tanggal)
    : kode === kodeBulan(sekarang)
      ? hariIniInput()
      : awal > sekarang
        ? tanggalInput(rentang.gte)
        : tanggalInput(akhirBulan);

  const keadaan = ada ? "sudah dicek, bisa diedit" : sebelumnya ? "nilai awal dari pengecekan sebelumnya" : "pengecekan pertama";

  return (
    <div className="min-w-0">
      <PageHeader
        judul={`Cek ${user.lokasi.nama}`}
        deskripsi={`${fmtBulan(awal)} · ${keadaan}`}
        aksi={
          <Link href={kembali} className={`${btnSecondary} justify-center`}>
            ← Kembali
          </Link>
        }
      />

      {barang.length === 0 ? (
        <EmptyState judul="Belum ada barang di lokasi ini" pesan="Barang akan muncul setelah admin mencatat barang masuk." />
      ) : (
        <PengecekanForm
          key={ada?.id ?? `baru-${kode}`}
          lokasiId={lokasiId}
          pengecekanId={ada?.id}
          minTanggal={tanggalInput(rentang.gte)}
          maxTanggal={tanggalInput(akhirBulan)}
          tanggalAwal={tanggalAwal}
          petugasAwal={ada?.petugas ?? user.nama}
          catatanAwal={ada?.catatan ?? ""}
          daftar={daftar}
          kembali={kembali}
        />
      )}
    </div>
  );
}