import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/login/AuthShell";
import LoginForm from "@/components/login/loginForm";
import { userDariSesi } from "@/lib/auth";

export default async function LoginPage() {
  // Sudah login dengan sesi yang masih berlaku → langsung ke panel admin.
  // Sesi dicabut / akun dihapus / menunggu persetujuan → form tetap ditampilkan
  // (mencegah redirect bolak-balik antara /login dan /admin).
  if (await userDariSesi()) redirect("/admin");

  return (
    <AuthShell judul="Masuk ke Akun" keterangan="Gunakan email dan password yang telah didaftarkan">
      <LoginForm />

      <p className="mt-6 text-center text-sm text-gray-500">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-semibold text-green-700 hover:underline">
          Daftar di sini
        </Link>
      </p>
    </AuthShell>
  );
}