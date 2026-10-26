import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "sarpras_session";
const DURASI_HARI = 7;

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET belum diisi di .env");
  return new TextEncoder().encode(secret);
}

export async function createSession(userId: number) {
  const expires = new Date(Date.now() + DURASI_HARI * 24 * 60 * 60 * 1000);

  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
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

export async function getSession(): Promise<{ userId: number } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getKey());
    return typeof payload.userId === "number" ? { userId: payload.userId } : null;
  } catch {
    return null; // token rusak atau kedaluwarsa
  }
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE);
}