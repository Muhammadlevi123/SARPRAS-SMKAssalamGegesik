import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "sarpras_session";
const DURASI_HARI = 7;

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET belum diisi di .env");
  // Rahasia pendek bisa ditebak → wajib minimal 32 karakter acak
  if (secret.length < 32) throw new Error("SESSION_SECRET terlalu pendek (minimal 32 karakter)");
  return new TextEncoder().encode(secret);
}

// versi = User.sesiVersi saat login. Kalau di database sudah naik, token ini tidak berlaku lagi.
export async function createSession(userId: number, versi: number) {
  const expires = new Date(Date.now() + DURASI_HARI * 24 * 60 * 60 * 1000);

  const token = await new SignJWT({ userId, v: versi })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(getKey());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    // Ubah ke false hanya jika situs dijalankan lewat http (bukan https) di server sekolah
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function getSession(): Promise<{ userId: number; versi: number } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  try {
    // algorithms dikunci: token dengan algoritma lain langsung ditolak
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "number" || typeof payload.v !== "number") return null;
    return { userId: payload.userId, versi: payload.v };
  } catch {
    return null; // token rusak atau kedaluwarsa
  }
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE);
}