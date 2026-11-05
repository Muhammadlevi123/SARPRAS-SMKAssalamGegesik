"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isUniqueError } from "@/lib/prismaError";
import { ambilIp, catatDaftar, cekBatasDaftar, rapikanEmail } from "@/lib/keamananLogin";

export type DaftarState = {
  ok?: boolean;
  error?: string;
  nama?: string;
  email?: string;
};

const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_DETIK = 3; // manusia butuh lebih dari 3 detik untuk mengisi form

export async function daftar(_prev: DaftarState, formData: FormData): Promise<DaftarState> {
  const nama = String(formData.get("nama") ?? "").trim().replace(/\s+/g, " ");
  const email = rapikanEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const ulangi = String(formData.get("ulangiPassword") ?? "");
  const jebakan = String(formData.get("website") ?? ""); // honeypot: manusia tidak melihat kolom ini
  const mulai = Number(formData.get("mulai")) || 0;
  const isian = { nama, email };

  // ===== 1. Deteksi bot: pura-pura berhasil, tapi tidak disimpan =====
  if (jebakan || !mulai || Date.now() - mulai < MIN_DETIK * 1000) {
    return { ok: true };
  }

  // ===== 2. Cek isian =====
  if (nama.length < 3 || nama.length > 100) return { error: "Nama lengkap 3–100 karakter", ...isian };
  if (email.length > 254 || !POLA_EMAIL.test(email)) return { error: "Format email tidak valid", ...isian };
  if (password.length < 8) return { error: "Password minimal 8 karakter", ...isian };
  if (password.length > 72) return { error: "Password maksimal 72 karakter", ...isian };
  if (password !== ulangi) return { error: "Ulangi password tidak sama", ...isian };
  if (password.toLowerCase() === email || password.toLowerCase() === email.split("@")[0]) {
    return { error: "Password tidak boleh sama dengan email", ...isian };
  }

  // ===== 3. Batas pendaftaran per jaringan =====
  const ip = await ambilIp();
  if (await cekBatasDaftar(ip)) {
    return { error: "Terlalu banyak pendaftaran dari jaringan ini. Coba lagi dalam 1 jam.", ...isian };
  }

  // ===== 4. Simpan. Role USER & tanpa lokasi = menunggu persetujuan admin =====
  try {
    await prisma.user.create({
      data: { nama, email, password: await bcrypt.hash(password, 12) },
    });
  } catch (e) {
    // Email sudah terdaftar: jangan diberi tahu (supaya bot tidak bisa mengecek email yang terdaftar)
    if (!isUniqueError(e)) throw e;
  }

  await catatDaftar(email, ip);
  return { ok: true };
}