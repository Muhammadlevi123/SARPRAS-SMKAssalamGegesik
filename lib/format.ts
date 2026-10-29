const TZ = "Asia/Jakarta";

// ===== Sumber barang masuk (dipakai server & client) =====
export const DAFTAR_SUMBER = ["PEMBELIAN", "MOU", "BANTUAN", "LAMA"] as const;
export type SumberKode = (typeof DAFTAR_SUMBER)[number];

export const SUMBER_LABEL: Record<SumberKode, string> = {
  PEMBELIAN: "Pembelian",
  MOU: "MOU / Kerja Sama",
  BANTUAN: "Bantuan",
  LAMA: "Barang Lama",
};

export function isSumber(s: string): s is SumberKode {
  return (DAFTAR_SUMBER as readonly string[]).includes(s);
}

// ===== Format tampilan =====
export const fmtAngka = (n: number) => n.toLocaleString("id-ID");
export const fmtRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

export const fmtTanggal = (d: Date) =>
  d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });

export const fmtTanggalPendek = (d: Date) =>
  d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: TZ });

export const fmtBulan = (d: Date) =>
  d.toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: TZ });

// ===== Tanggal (WIB) =====
const pad = (n: number) => String(n).padStart(2, "0");

// Ambil tahun, bulan, hari sebuah tanggal menurut WIB
export function bagianWIB(d: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(d);
  const ambil = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: ambil("year"), m: ambil("month"), d: ambil("day") };
}

// Hari ini dalam format "2026-10-27" (untuk nilai awal <input type="date">)
export function hariIniInput() {
  const { y, m, d } = bagianWIB(new Date());
  return `${y}-${pad(m)}-${pad(d)}`;
}

// "2026-10-27" → Date jam 00:00 WIB. null kalau formatnya salah
export function parseTanggal(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00+07:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Rentang satu bulan (WIB) tempat sebuah tanggal berada
export function rentangBulan(tanggal: Date) {
  const { y, m } = bagianWIB(tanggal);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return {
    gte: new Date(`${y}-${pad(m)}-01T00:00:00+07:00`),
    lt: new Date(`${ny}-${pad(nm)}-01T00:00:00+07:00`),
  };
}

// Rentang tahun kalender / tahun anggaran (WIB)
export function rentangTahunKalender(tahun: number) {
  return {
    gte: new Date(`${tahun}-01-01T00:00:00+07:00`),
    lt: new Date(`${tahun + 1}-01-01T00:00:00+07:00`),
  };
}

// Date → "2026-10-27" menurut WIB (untuk nilai <input type="date">)
export function tanggalInput(tanggal: Date) {
  const { y, m, d } = bagianWIB(tanggal);
  return `${y}-${pad(m)}-${pad(d)}`;
}

// ===== Biaya lain-lain di nota pembelian (ongkir, diskon, biaya layanan, dll.) =====
export type BiayaLain = { nama: string; jumlah: number }; // jumlah minus = potongan

// Baca isi kolom Json biayaLain dengan aman
export function bacaBiayaLain(v: unknown): BiayaLain[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    return typeof o.nama === "string" && typeof o.jumlah === "number" && Number.isInteger(o.jumlah)
      ? [{ nama: o.nama, jumlah: o.jumlah }]
      : [];
  });
}

export const totalBiayaLain = (b: BiayaLain[]) => b.reduce((t, x) => t + x.jumlah, 0);

// ===== Bulan untuk alamat halaman (?bulan=2026-10) =====

// Date → "2026-10" (WIB)
export function kodeBulan(tanggal: Date) {
  const { y, m } = bagianWIB(tanggal);
  return `${y}-${pad(m)}`;
}

// "2026-10" → tanggal 1 jam 00:00 WIB. null kalau formatnya salah
export function parseBulan(s?: string): Date | null {
  if (!s || !/^\d{4}-\d{2}$/.test(s)) return null;
  const [y, m] = s.split("-").map(Number);
  if (m < 1 || m > 12) return null;
  return new Date(`${y}-${pad(m)}-01T00:00:00+07:00`);
}

// geserBulan("2026-10", -1) → "2026-09"
export function geserBulan(kode: string, n: number) {
  const [y, m] = kode.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}