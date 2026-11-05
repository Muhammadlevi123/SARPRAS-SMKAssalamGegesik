"use server"; // ← WAJIB baris paling pertama, sebelum import apa pun

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deleteSession, getSession } from "@/lib/session";

// Tombol "Keluar" di menu profil
export async function logout() {
  const session = await getSession();
  if (session) {
    // sesiVersi naik → cookie lama (termasuk salinan yang mungkin dicuri) tidak berlaku lagi
    await prisma.user.updateMany({
      where: { id: session.userId },
      data: { sesiVersi: { increment: 1 } },
    });
  }
  await deleteSession();
  redirect("/login");
}