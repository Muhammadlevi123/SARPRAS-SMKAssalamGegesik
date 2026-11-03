import "server-only";
import { prisma } from "@/lib/prisma";
import { fmtBulan, kodeBulan, parseBulan, rentangBulan } from "@/lib/format";

// ===== Jenis laporan =====
export const JENIS = {
  inventaris: { label: "Inventaris per Lokasi", judul: "Inventaris" },
  "barang-masuk": { label: "Barang Masuk", judul: "Barang Masuk" },
  pengecekan: { label: "Rekap Pengecekan", judul: "Rekap Pengecekan" },
} as const;

export type Jenis = keyof typeof JENIS;
export type Kertas = "F4" | "A4";
export type Arah = "tegak" | "mendatar";
export type RentangTanggal = { gte: Date; lt: Date };

export type FilterLaporan = {
  jenis: Jenis;
  ta: { id: number; nama: string };
  bulan: { kode: string; tanggal: Date }[]; // kosong = semua bulan
  rentang: RentangTanggal[]; // periode yang dimasukkan ke laporan
  akhir: Date; // untuk Inventaris: kondisi per tanggal ini
  lokasi: { id: number; nama: string }[]; // lokasi terpilih
  semuaLokasi: boolean;
  judul: string; // "Inventaris Bengkel Mobil"
  subjudul: string[]; // baris-baris di bawah judul
  namaFile: string; // tanpa ekstensi
  kertas: Kertas;
  arah: Arah;
};

const SEHARI = 24 * 60 * 60 * 1000;

// "oktober 2026" → "Oktober 2026"
export const hurufBesar = (s: string) => s.replace(/(^|\s)\S/g, (h) => h.toUpperCase());

type ParamMentah = URLSearchParams | Record<string, string | string[] | undefined>;

// Ambil semua nilai sebuah parameter (?lokasi=1&lokasi=2 → ["1","2"])
function semua(sp: ParamMentah, kunci: string): string[] {
  if (sp instanceof URLSearchParams) return sp.getAll(kunci);
  const v = sp[kunci];
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
}
const satu = (sp: ParamMentah, kunci: string) => semua(sp, kunci)[0] ?? "";

/**
 * Baca & periksa filter laporan dari URL.
 * Dipakai oleh halaman cetak dan Excel supaya isinya selalu sama.
 */
export async function bacaFilter(sp: ParamMentah): Promise<FilterLaporan | null> {
  const jenisMentah = satu(sp, "jenis");
  if (!(jenisMentah in JENIS)) return null;
  const jenis = jenisMentah as Jenis;

  const ta = await prisma.tahunAjaran.findUnique({ where: { id: Number(satu(sp, "ta")) || 0 } });
  if (!ta) return null;
  const rentangTA: RentangTanggal = { gte: ta.mulai, lt: new Date(ta.selesai.getTime() + SEHARI) };

  // Bulan: hanya yang ada di dalam tahun ajaran. Inventaris cukup satu bulan.
  let bulan = [...new Set(semua(sp, "bulan"))]
    .map((k) => parseBulan(k))
    .filter((t): t is Date => !!t && t < rentangTA.lt && rentangBulan(t).lt > rentangTA.gte)
    .sort((a, b) => a.getTime() - b.getTime())
    .map((t) => ({ kode: kodeBulan(t), tanggal: t }));
  if (jenis === "inventaris") bulan = bulan.slice(-1);

  const rentang = bulan.length ? bulan.map((b) => rentangBulan(b.tanggal) as RentangTanggal) : [rentangTA];

  // Akhir periode (tidak melewati hari ini)
  const batas = new Date(Math.max(...rentang.map((r) => r.lt.getTime())) - 1);
  const sekarang = new Date();
  const akhir = batas < sekarang ? batas : sekarang;

  // Lokasi: kosong / semua dicentang = semua lokasi
  const semuaLok = await prisma.lokasi.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } });
  const dipilih = new Set(semua(sp, "lokasi").map(Number));
  const lokasiTerpilih = semuaLok.filter((l) => dipilih.has(l.id));
  const semuaLokasi = lokasiTerpilih.length === 0 || lokasiTerpilih.length === semuaLok.length;
  const lokasi = semuaLokasi ? semuaLok : lokasiTerpilih;

  // Judul & keterangan di bawah judul
  const dataJenis = JENIS[jenis];
  const judul = lokasi.length === 1 && !semuaLokasi ? `${dataJenis.judul} ${lokasi[0].nama}` : dataJenis.label;

  const namaBulan = bulan.map((b) => hurufBesar(fmtBulan(b.tanggal)));
  const barisPeriode = [`Tahun Ajaran ${ta.nama}`, namaBulan.length ? `Bulan ${namaBulan.join(", ")}` : ""]
    .filter(Boolean)
    .join(" · ");
  const subjudul = [barisPeriode];
  if (!semuaLokasi && lokasi.length > 1) subjudul.push(`Lokasi: ${lokasi.map((l) => l.nama).join(", ")}`);

  const namaFile = [`Laporan ${judul}`, `TA ${ta.nama.replace("/", "-")}`, ...namaBulan]
    .join(" - ")
    .replace(/[\\/:*?"<>|]/g, "-");

  return {
    jenis,
    ta: { id: ta.id, nama: ta.nama },
    bulan,
    rentang,
    akhir,
    lokasi,
    semuaLokasi,
    judul,
    subjudul,
    namaFile,
    kertas: satu(sp, "kertas") === "A4" ? "A4" : "F4",
    arah: satu(sp, "arah") === "mendatar" ? "mendatar" : "tegak",
  };
}

// Syarat "tanggal ada di salah satu periode" untuk query Prisma
export const dalamPeriode = (f: FilterLaporan) => ({ OR: f.rentang.map((r) => ({ tanggal: r })) });

// Syarat lokasi untuk query Prisma (undefined = semua lokasi)
export const idLokasi = (f: FilterLaporan) => (f.semuaLokasi ? undefined : { in: f.lokasi.map((l) => l.id) });