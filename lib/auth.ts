import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// cache(): dipanggil berkali-kali dalam satu request, query database hanya sekali
export const requireUser = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      nama: true,
      email: true,
      role: true,
      lokasiId: true, // lokasi tanggung jawab (kosong = belum ditetapkan admin)
      lokasi: { select: { id: true, nama: true } },
    },
  });

  // Akun sudah dihapus tapi cookie masih ada
  if (!user) redirect("/login");

  return user;
});

// Khusus Admin. User biasa yang mencoba membuka halaman/aksi admin dikembalikan ke Dashboard.
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/admin");
  return user;
}