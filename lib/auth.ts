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
    select: { id: true, nama: true, email: true },
  });

  // Akun sudah dihapus tapi cookie masih ada
  if (!user) redirect("/login");

  return user;
});