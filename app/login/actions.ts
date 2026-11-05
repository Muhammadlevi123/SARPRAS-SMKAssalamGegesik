"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { ambilIp, catatPercobaan, cekKunci, rapikanEmail } from "@/lib/keamananLogin";
import { berandaUntuk } from "@/lib/auth";

export type LoginState = {
  error?: string;
  email?: string;
};

// Hash asli yang dibuat sekali saat server menyala. Dipakai agar waktu respons
// sama baik akun ada maupun tidak, sehingga email tidak bisa ditebak lewat kecepatan.
const DUMMY_HASH = bcrypt.hashSync("tidak-dipakai", 10);

const MAKS_EMAIL = 254;
const MAKS_PASSWORD = 72; // bcrypt hanya membaca 72 byte pertama

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = rapikanEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email dan password wajib diisi", email };
  }
  // Isian kepanjangan: tolak tanpa memproses (mencegah beban server)
  if (email.length > MAKS_EMAIL || password.length > MAKS_PASSWORD) {
    return { error: "Email atau password salah", email };
  }

  // 1. Sedang dikunci karena terlalu banyak salah?
  const ip = await ambilIp();
  const menit = await cekKunci(email, ip);
  if (menit > 0) {
    await catatPercobaan(email, ip, "terkunci");
    return { error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${menit} menit.`, email };
  }

  // 2. Cek email & password
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, password: true, role: true, lokasiId: true, sesiVersi: true },
  });
  const cocok = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

  if (!user || !cocok) {
    await catatPercobaan(email, ip, "password");
    return { error: "Email atau password salah", email };
  }

  // 3. Akun hasil registrasi yang belum disetujui admin (belum punya lokasi)
  if (user.role === "USER" && !user.lokasiId) {
    await catatPercobaan(email, ip, "menunggu");
    return {
      error: "Akun Anda belum disetujui. Hubungi admin untuk menetapkan lokasi tanggung jawab Anda.",
      email,
    };
  }

  // 4. Berhasil
  await catatPercobaan(email, ip, null);
  await createSession(user.id, user.sesiVersi);
    redirect(berandaUntuk(user.role)); // ADMIN → /admin, USER → /user. Jangan dibungkus try/catch
}