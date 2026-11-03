import "server-only";
import { prisma } from "@/lib/prisma";
import { stokSampai } from "@/lib/stok";
import { DAFTAR_SUMBER, SUMBER_LABEL, bacaBiayaLain, bagianWIB, fmtAngka, totalBiayaLain } from "@/lib/format";
import { dalamPeriode, idLokasi, type FilterLaporan } from "./filter";

/*
 * Semua query & hitungan laporan ada di sini.
 * Halaman cetak dan Excel memakai fungsi yang sama → angkanya pasti sama.
 */

// Jumlah seharusnya per barang pada beberapa tanggal sekaligus
async function stokPadaTanggal(tanggal: Date[]) {
  const unik = [...new Set(tanggal.map((t) => t.getTime()))];
  return new Map(await Promise.all(unik.map(async (t) => [t, await stokSampai(new Date(t))] as const)));
}

// ======================= 1. INVENTARIS =======================

export type BarisInventaris = {
  id: number;
  kode: string | null;
  nama: string;
  merk: string | null;
  jumlah: number;
  satuan: string;
  tahun: string; // "2024, 2026"
  sumber: string; // "Pembelian, Bantuan"
  kondisi: { baik: number; kurang: number; rusak: number } | null; // null = belum dicek
  keterangan: string;
};

export type GrupInventaris = {
  id: number;
  nama: string;
  pj: string | null;
  tanggalCek: Date | null;
  barang: BarisInventaris[];
};

export async function dataInventaris(f: FilterLaporan): Promise<GrupInventaris[]> {
  const lokasiId = idLokasi(f);

  const [barang, stok, terakhir] = await Promise.all([
    prisma.barang.findMany({
      where: { lokasiId, createdAt: { lte: f.akhir } },
      include: { lokasi: { select: { id: true, nama: true, penanggungJawab: true } } },
      orderBy: [{ lokasi: { nama: "asc" } }, { nama: "asc" }],
    }),
    stokSampai(f.akhir),
    // Pengecekan TERAKHIR tiap lokasi sampai akhir periode
    prisma.pengecekan.groupBy({
      by: ["lokasiId"],
      where: { tanggal: { lte: f.akhir }, lokasiId },
      _max: { tanggal: true },
    }),
  ]);
  if (barang.length === 0) return [];

  const [daftarCek, riwayatMasuk] = await Promise.all([
    terakhir.length
      ? prisma.pengecekan.findMany({
          where: { OR: terakhir.map((t) => ({ lokasiId: t.lokasiId, tanggal: t._max.tanggal! })) },
          include: { items: true },
        })
      : Promise.resolve([]),
    prisma.barangMasukItem.findMany({
      where: { barangId: { in: barang.map((b) => b.id) }, barangMasuk: { tanggal: { lte: f.akhir } } },
      select: { barangId: true, barangMasuk: { select: { tanggal: true, sumber: true } } },
      orderBy: { barangMasuk: { tanggal: "asc" } },
    }),
  ]);

  const cekPerLokasi = new Map(daftarCek.map((c) => [c.lokasiId, c]));
  const stokSaatCek = await stokPadaTanggal(daftarCek.map((c) => c.tanggal));

  // Tahun & sumber perolehan
  const perolehan = new Map<number, { tahun: Set<number>; sumber: Set<string> }>();
  for (const r of riwayatMasuk) {
    const p = perolehan.get(r.barangId) ?? { tahun: new Set<number>(), sumber: new Set<string>() };
    p.tahun.add(bagianWIB(r.barangMasuk.tanggal).y);
    p.sumber.add(SUMBER_LABEL[r.barangMasuk.sumber]);
    perolehan.set(r.barangId, p);
  }

  const grup = new Map<number, GrupInventaris>();
  for (const b of barang) {
    const cek = cekPerLokasi.get(b.lokasi.id);
    const g = grup.get(b.lokasi.id) ?? {
      id: b.lokasi.id,
      nama: b.lokasi.nama,
      pj: b.lokasi.penanggungJawab,
      tanggalCek: cek?.tanggal ?? null,
      barang: [],
    };

    const jumlah = stok.get(b.id) ?? 0;
    const item = cek?.items.find((i) => i.barangId === b.id);
    const seharusnya = (cek && stokSaatCek.get(cek.tanggal.getTime())?.get(b.id)) ?? jumlah;
    const hilang = item ? Math.max(0, seharusnya - item.jumlahAda) : 0;
    const p = perolehan.get(b.id);

    g.barang.push({
      id: b.id,
      kode: b.kode,
      nama: b.nama,
      merk: b.merk,
      jumlah,
      satuan: b.satuan,
      tahun: p ? [...p.tahun].join(", ") : "",
      sumber: p ? [...p.sumber].join(", ") : "",
      kondisi: item
        ? {
            baik: Math.max(0, item.jumlahAda - item.rusakRingan - item.rusakBerat),
            kurang: item.rusakRingan,
            rusak: item.rusakBerat,
          }
        : null,
      // Hilang tidak punya kolom sendiri (mengikuti format Excel sekolah) → masuk keterangan
      keterangan: [hilang > 0 ? `Hilang ${fmtAngka(hilang)} ${b.satuan}` : "", item?.keterangan ?? ""]
        .filter(Boolean)
        .join(" · "),
    });
    grup.set(b.lokasi.id, g);
  }

  return [...grup.values()];
}

// ======================= 2. BARANG MASUK =======================

export type BarisBarangMasuk = {
  id: number;
  tanggal: Date;
  noNota: string | null;
  sumber: string;
  mitra: string | null;
  keterangan: string | null;
  barang: string;
  merk: string | null;
  lokasi: string;
  jumlah: number;
  satuan: string;
  // Diisi hanya di baris pertama tiap nota (sel "Total" digabung ke bawah)
  nota: { span: number; total: number | null; sebagian: boolean } | null;
};

export type DataBarangMasuk = {
  baris: BarisBarangMasuk[];
  rekap: { sumber: string; nota: number; unit: number; nilai: number }[];
  totalNilai: number;
  adaSebagian: boolean;
};

export async function dataBarangMasuk(f: FilterLaporan): Promise<DataBarangMasuk> {
  const lokasiId = idLokasi(f);

  const daftar = await prisma.barangMasukItem.findMany({
    where: { barangMasuk: dalamPeriode(f), barang: lokasiId ? { lokasiId } : undefined },
    include: {
      barang: { select: { nama: true, merk: true, satuan: true, lokasi: { select: { nama: true } } } },
      barangMasuk: {
        select: {
          tanggal: true,
          sumber: true,
          noNota: true,
          keterangan: true,
          biayaLain: true,
          mitra: { select: { nama: true } },
          _count: { select: { items: true } },
        },
      },
    },
    orderBy: [{ barangMasuk: { tanggal: "asc" } }, { barangMasukId: "asc" }, { id: "asc" }],
  });

  // Kelompokkan per nota
  const perNota = new Map<number, typeof daftar>();
  for (const it of daftar) perNota.set(it.barangMasukId, [...(perNota.get(it.barangMasukId) ?? []), it]);

  // Total pembayaran per nota = subtotal barang + biaya lain-lain (ongkir, layanan, diskon)
  const totalNota = new Map<number, { total: number | null; sebagian: boolean; nilai: number }>();
  for (const [id, items] of perNota) {
    const n = items[0].barangMasuk;
    const sebagian = items.length < n._count.items; // sebagian barang nota ada di lokasi lain
    const subtotal = items.reduce((t, it) => t + (it.harga ?? 0) * it.jumlah, 0);
    const nilai = subtotal + (sebagian ? 0 : totalBiayaLain(bacaBiayaLain(n.biayaLain)));
    const ada = n.sumber === "PEMBELIAN" || nilai !== 0;
    totalNota.set(id, { total: ada ? nilai : null, sebagian, nilai });
  }

  const baris: BarisBarangMasuk[] = daftar.map((it) => {
    const items = perNota.get(it.barangMasukId)!;
    const t = totalNota.get(it.barangMasukId)!;
    return {
      id: it.id,
      tanggal: it.barangMasuk.tanggal,
      noNota: it.barangMasuk.noNota,
      sumber: SUMBER_LABEL[it.barangMasuk.sumber],
      mitra: it.barangMasuk.mitra?.nama ?? null,
      keterangan: it.barangMasuk.keterangan,
      barang: it.barang.nama,
      merk: it.barang.merk,
      lokasi: it.barang.lokasi.nama,
      jumlah: it.jumlah,
      satuan: it.barang.satuan,
      nota: items[0].id === it.id ? { span: items.length, total: t.total, sebagian: t.sebagian } : null,
    };
  });

  const rekap = DAFTAR_SUMBER.map((s) => {
    const nota = [...perNota.entries()].filter(([, items]) => items[0].barangMasuk.sumber === s);
    return {
      sumber: SUMBER_LABEL[s],
      nota: nota.length,
      unit: nota.reduce((t, [, items]) => t + items.reduce((u, it) => u + it.jumlah, 0), 0),
      nilai: nota.reduce((t, [id]) => t + totalNota.get(id)!.nilai, 0),
    };
  }).filter((r) => r.nota > 0);

  return {
    baris,
    rekap,
    totalNilai: rekap.reduce((t, r) => t + r.nilai, 0),
    adaSebagian: [...totalNota.values()].some((x) => x.sebagian),
  };
}

// ======================= 3. REKAP PENGECEKAN =======================

export type BarisPengecekan = {
  id: number;
  tanggal: Date;
  petugas: string;
  total: number;
  baik: number;
  kurang: number;
  rusak: number;
  hilang: number;
};

export type GrupPengecekan = { id: number; nama: string; pj: string | null; cek: BarisPengecekan[] };

export async function dataPengecekan(f: FilterLaporan): Promise<GrupPengecekan[]> {
  const lokasiId = idLokasi(f);

  const [daftarLokasi, daftarCek] = await Promise.all([
    // Lokasi yang punya barang = yang memang perlu dicek
    prisma.lokasi.findMany({
      where: { id: lokasiId, barang: { some: {} } },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, penanggungJawab: true },
    }),
    prisma.pengecekan.findMany({
      where: { ...dalamPeriode(f), lokasiId },
      include: { items: { select: { barangId: true, jumlahAda: true, rusakRingan: true, rusakBerat: true } } },
      orderBy: { tanggal: "asc" },
    }),
  ]);

  const stokSaatCek = await stokPadaTanggal(daftarCek.map((c) => c.tanggal));

  const cekPerLokasi = new Map<number, BarisPengecekan[]>();
  for (const c of daftarCek) {
    const stok = stokSaatCek.get(c.tanggal.getTime());
    const r: BarisPengecekan = { id: c.id, tanggal: c.tanggal, petugas: c.petugas, total: 0, baik: 0, kurang: 0, rusak: 0, hilang: 0 };
    for (const it of c.items) {
      const seharusnya = stok?.get(it.barangId) ?? it.jumlahAda;
      r.total += seharusnya; // total barang sebenarnya (apa pun kondisinya)
      r.baik += Math.max(0, it.jumlahAda - it.rusakRingan - it.rusakBerat);
      r.kurang += it.rusakRingan;
      r.rusak += it.rusakBerat;
      r.hilang += Math.max(0, seharusnya - it.jumlahAda);
    }
    cekPerLokasi.set(c.lokasiId, [...(cekPerLokasi.get(c.lokasiId) ?? []), r]);
  }

  return daftarLokasi.map((l) => ({ id: l.id, nama: l.nama, pj: l.penanggungJawab, cek: cekPerLokasi.get(l.id) ?? [] }));
}