"use server";

export type LoginState = {
  error?: string;
  email?: string;
};

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Username dan password wajib diisi", email };
  }

  // TODO: cek ke database dan buat sesi (langkah berikutnya)
  return { error: "Login belum terhubung ke database", email };
}