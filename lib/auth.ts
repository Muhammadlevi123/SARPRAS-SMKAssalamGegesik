import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/** Halaman awal sesuai role. Satu-satunya tempat aturan ini ditulis. */
export const berandaUntuk = (role: string) => (role === "ADMIN" ? "/admin" : "/user");

/**
 * User dari cookie sesi, atau null kalau:
 * - belum login / token rusak / kedaluwarsa
 * - akunnya sudah dihapus
 * - sesinya sudah dicabut (sesiVersi di database sudah naik)
 * - USER yang belum ditetapkan lokasinya oleh admin
 * Tidak melempar ke /login, jadi aman dipakai di route API.
 * cache(): dipanggil berkali-kali dalam satu request, query database hanya sekali.
 */
export const userDariSesi = cache(async () => {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      nama: true,
      email: true,
      role: true,
      sesiVersi: true,
      lokasiId: true, // lokasi tanggung jawab (kosong = belum ditetapkan admin)
      lokasi: { select: { id: true, nama: true } },
    },
  });
  if (!user) return null;

  const { sesiVersi, ...data } = user;
  if (sesiVersi !== session.versi) return null; // sesi sudah dicabut
  if (data.role === "USER" && !data.lokasiId) return null; // menunggu persetujuan admin

  return data;
});

// Untuk halaman & server action: belum login / tidak berhak → ke halaman login
export const requireUser = cache(async () => {
  const user = await userDariSesi();
  if (!user) redirect("/login");
  return user;
});

// Khusus ADMIN. USER yang mencoba membuka halaman/aksi admin dikembalikan ke /user.
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect(berandaUntuk(user.role));
  return user;
}

// Khusus USER (pemegang lokasi). ADMIN yang membuka halaman /user dikembalikan ke /admin.
// lokasi dijamin terisi, jadi di halaman /user tidak perlu cek null lagi.
export async function requirePengguna() {
  const user = await requireUser();
  if (user.role !== "USER" || !user.lokasi) redirect(berandaUntuk(user.role));
  return { ...user, lokasi: user.lokasi };
}