import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { stokSampai } from "@/lib/stok";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import TombolHapus from "@/components/admin/TombolHapus";
import PengecekanForm from "@/components/admin/pengecekan/PengecekanForm";
import { btnPrimary, btnSecondary } from "@/components/admin/ui";
import { fmtBulan, hariIniInput, kodeBulan, parseBulan, rentangBulan, tanggalInput } from "@/lib/format";
import { hapusPengecekan } from "../../actions";

const SEHARI = 24 * 60 * 60 * 1000;

export default async function CekLokasiPage({
  params,
  searchParams,
}: {
  params: Promise<{ lokasiId: string }>;
  searchParams: Promise<{ bulan?: string }>;
}) {
  await requireUser();

  const lokasiId = Number((await params).lokasiId);
  if (!Number.isInteger(lokasiId) || lokasiId <= 0) notFound();

  const sp = await searchParams;
  const sekarang = new Date();
  const awal = parseBulan(sp.bulan) ?? rentangBulan(sekarang).gte;
  const rentang = rentangBulan(awal);
  const kode = kodeBulan(awal);
  const bulanIni = kode === kodeBulan(sekarang);
  const akhirBulan = new Date(rentang.lt.getTime() - SEHARI);

  // Kembali ke papan per lokasi bulan ini
  const kembali = `/admin/pengecekan/bulan/${kode}`;

  const [lokasi, barang, ada] = await Promise.all([
    prisma.lokasi.findUnique({ where: { id: lokasiId }, select: { nama: true, penanggungJawab: true } }),
    prisma.barang.findMany({
      where: { lokasiId },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, merk: true, kode: true, satuan: true },
    }),
    // Pengecekan lokasi ini di bulan yang dipilih (kalau sudah ada → mode edit)
    prisma.pengecekan.findFirst({ where: { lokasiId, tanggal: rentang }, include: { items: true } }),
  ]);
  if (!lokasi) notFound();

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
    const sekarangItem = itemAda.get(b.id);

    // Mode edit: pakai data yang sudah tersimpan
    if (sekarangItem) {
      return {
        ...b,
        seharusnya,
        baik: sekarangItem.jumlahAda - sekarangItem.rusakRingan - sekarangItem.rusakBerat,
        kurang: sekarangItem.rusakRingan,
        rusak: sekarangItem.rusakBerat,
        ket: sekarangItem.keterangan ?? "",
      };
    }

    // Pengecekan baru: bawa kondisi bulan lalu, sisanya dianggap baik
    const lalu = itemLalu.get(b.id);
    const kurang = Math.min(lalu?.rusakRingan ?? 0, seharusnya);
    const rusak = Math.min(lalu?.rusakBerat ?? 0, seharusnya - kurang);
    return { ...b, seharusnya, baik: seharusnya - kurang - rusak, kurang, rusak, ket: "" };
  });

  // Tanggal awal di form
  const tanggalAwal = ada
    ? tanggalInput(ada.tanggal) // sudah pernah dicek → pakai tanggal tersimpan
    : bulanIni
      ? hariIniInput() // bulan berjalan → hari ini
      : awal > sekarang
        ? tanggalInput(rentang.gte) // bulan yang akan datang → tanggal 1
        : tanggalInput(akhirBulan); // bulan yang sudah lewat → akhir bulan

  const judul = `Cek ${lokasi.nama}`;
  const keadaan = ada
    ? "sudah dicek, bisa diedit"
    : sebelumnya
      ? "nilai awal dari pengecekan sebelumnya"
      : "pengecekan pertama";

  return (
    <div>
      <PageHeader
        judul={judul}
        deskripsi={`${fmtBulan(awal)} · PJ: ${lokasi.penanggungJawab ?? "–"} · ${keadaan}`}
        aksi={
          <div className="flex items-center gap-2">
            <Link href={kembali} className={btnSecondary}>Kembali</Link>
            {ada && (
              <TombolHapus
                action={hapusPengecekan}
                id={ada.id}
                nama={`Pengecekan ${lokasi.nama} ${fmtBulan(awal)}`}
              />
            )}
          </div>
        }
      />

      {barang.length === 0 ? (
        <EmptyState judul="Belum ada barang di lokasi ini" pesan="Tambahkan barang atau catat barang masuk terlebih dahulu.">
          <Link href="/admin/barang" className={btnPrimary}>Ke halaman Barang</Link>
        </EmptyState>
      ) : (
        <PengecekanForm
          key={ada?.id ?? `baru-${kode}`}
          lokasiId={lokasiId}
          pengecekanId={ada?.id}
          minTanggal={tanggalInput(rentang.gte)}
          maxTanggal={tanggalInput(akhirBulan)}
          tanggalAwal={tanggalAwal}
          petugasAwal={ada?.petugas ?? ""} // petugas diketik manual, tidak otomatis dari PJ
          catatanAwal={ada?.catatan ?? ""}
          daftar={daftar}
          kembali={kembali}
        />
      )}
    </div>
  );
}