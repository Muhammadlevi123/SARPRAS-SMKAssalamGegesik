import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/login/AuthShell";
import DaftarForm from "@/components/login/daftarForm";
import { userDariSesi } from "@/lib/auth";

export default async function DaftarPage() {
  // Sudah login → tidak perlu daftar
  if (await userDariSesi()) redirect("/admin");

  return (
    <AuthShell judul="Buat Akun" keterangan="Setelah mendaftar, admin akan menetapkan lokasi tanggung jawab Anda.">
      {/* mulai: waktu halaman dibuka, untuk mendeteksi bot yang mengirim terlalu cepat */}
      <DaftarForm mulai={Date.now()} />

      <p className="mt-6 text-center text-sm text-gray-500">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-semibold text-green-700 hover:underline">
          Masuk
        </Link>
      </p>
    </AuthShell>
  );
}