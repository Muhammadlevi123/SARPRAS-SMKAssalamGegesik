"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export type LoginState = {
  error?: string;
  email?: string;
};

// Hash asli yang dibuat sekali saat server menyala. Dipakai agar waktu respons
// sama baik akun ada maupun tidak, sehingga username tidak bisa ditebak lewat kecepatan.
const DUMMY_HASH = bcrypt.hashSync("tidak-dipakai", 10);

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Username dan password wajib diisi", email };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const cocok = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

  if (!user || !cocok) {
    return { error: "Username atau password salah", email };
  }

  await createSession(user.id);
  redirect("/admin"); // jangan dibungkus try/catch
}