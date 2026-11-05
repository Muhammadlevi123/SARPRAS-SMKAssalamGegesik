import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/* =========================================================
 * Keamanan login & registrasi
 * - Login per email : 5 kali salah dalam 15 menit → dikunci 15 menit
 * - Login per IP    : 20 kali salah dalam 15 menit → ditahan 15 menit
 * - Daftar per IP   : maksimal 3 pendaftaran per jam
 * - Riwayat disimpan 30 hari
 * ========================================================= */

export const BATAS_EMAIL = 5;
export const BATAS_IP = 20;
export const BATAS_DAFTAR_IP = 3;
const JENDELA = 15 * 60 * 1000; // 15 menit (ms)
const SEJAM = 60 * 60 * 1000;
const SIMPAN_HARI = 30;

export type AlasanGagal = "password" | "menunggu" | "terkunci";

// "  Budi@Gmail.COM " → "budi@gmail.com"
export const rapikanEmail = (s: string) => s.trim().toLowerCase();

// IP asli pengunjung. Di server, nginx WAJIB mengisi X-Real-IP dengan IP asli
// (proxy_set_header X-Real-IP $remote_addr;) supaya tidak bisa dipalsukan.
export async function ambilIp() {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  return ip.slice(0, 45) || "tidak-diketahui";
}

/**
 * Sisa waktu kunci (ms) berdasarkan percobaan gagal terakhir.
 * Terkunci kalau `batas` kali salah terjadi dalam 15 menit,
 * dan dibuka 15 menit setelah salah yang terakhir.
 */
async function sisaKunci(where: { email?: string; ip?: string }, batas: number, sejak: Date) {
  const gagal = await prisma.percobaanLogin.findMany({
    where: { ...where, berhasil: false, alasan: "password", createdAt: { gt: sejak } },
    orderBy: { createdAt: "desc" },
    take: batas,
    select: { createdAt: true },
  });
  if (gagal.length < batas) return 0;

  const terbaru = gagal[0].createdAt.getTime();
  const terlama = gagal[batas - 1].createdAt.getTime();
  if (terbaru - terlama > JENDELA) return 0; // salahnya tersebar, bukan beruntun

  return Math.max(0, terbaru + JENDELA - Date.now());
}

/** Login: berapa menit lagi harus menunggu (0 = boleh mencoba). */
export async function cekKunci(email: string, ip: string) {
  const batasWaktu = new Date(Date.now() - 2 * JENDELA);

  // Hitungan per email diulang dari nol setelah login berhasil
  const sukses = await prisma.percobaanLogin.findFirst({
    where: { email, berhasil: true, alasan: null },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const sejakEmail = sukses && sukses.createdAt > batasWaktu ? sukses.createdAt : batasWaktu;

  const [kunciEmail, kunciIp] = await Promise.all([
    sisaKunci({ email }, BATAS_EMAIL, sejakEmail),
    sisaKunci({ ip }, BATAS_IP, batasWaktu),
  ]);

  const sisa = Math.max(kunciEmail, kunciIp);
  return sisa > 0 ? Math.ceil(sisa / 60000) : 0;
}

/** Catat percobaan login. alasan = null berarti berhasil. */
export async function catatPercobaan(email: string, ip: string, alasan: AlasanGagal | null) {
  await prisma.percobaanLogin.create({
    data: { email: email.slice(0, 254), ip, berhasil: alasan === null, alasan },
  });

  // Bersih-bersih riwayat lama (cukup saat ada login berhasil)
  if (alasan === null) {
    await prisma.percobaanLogin.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - SIMPAN_HARI * 24 * 60 * 60 * 1000) } },
    });
  }
}

/* ===================== Registrasi ===================== */

/** Sudah 3 pendaftaran dari IP ini dalam 1 jam terakhir? */
export async function cekBatasDaftar(ip: string) {
  const jumlah = await prisma.percobaanLogin.count({
    where: { ip, alasan: "daftar", createdAt: { gt: new Date(Date.now() - SEJAM) } },
  });
  return jumlah >= BATAS_DAFTAR_IP;
}

/** Catat pendaftaran (dipakai untuk batas per IP & riwayat). */
export async function catatDaftar(email: string, ip: string) {
  await prisma.percobaanLogin.create({
    // berhasil: false → tidak dianggap "login berhasil" oleh cekKunci
    data: { email: email.slice(0, 254), ip, berhasil: false, alasan: "daftar" },
  });
}