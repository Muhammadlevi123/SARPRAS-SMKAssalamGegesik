import Sidebar from "@/components/admin/Sidebar";
import Toaster from "@/components/admin/Toaster";
import { BG_KONTEN } from "@/components/admin/theme";
import { requirePengguna } from "@/lib/auth";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  // Belum login → /login. ADMIN → /admin. Hanya USER yang punya lokasi yang lewat.
  const user = await requirePengguna();

  const hariIni = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

  return (
    <div className="min-h-screen bg-green-900 md:flex print:block print:bg-white">
      <Sidebar user={{ nama: user.nama, email: user.email }} jenis="user" />

      <div className="print-putih flex min-h-screen min-w-0 flex-1 flex-col" style={{ backgroundColor: BG_KONTEN }}>
        <header className="border-b border-green-100 bg-white px-4 py-3 sm:px-6 sm:py-4 md:sticky md:top-0 md:z-20 md:px-8 print:hidden">
          <h1 className="truncate font-(family-name:--font-display) text-lg font-bold text-gray-900 sm:text-xl md:text-2xl">
            Selamat datang, {user.nama}!
          </h1>
          <p className="truncate text-xs text-gray-500 sm:text-sm">
            {hariIni} · <b className="font-semibold text-gray-700">{user.lokasi.nama}</b>
          </p>
        </header>

        <main className="flex-1 p-4 sm:p-6 md:p-8 print:p-0">{children}</main>
      </div>

      <Toaster />
    </div>
  );
}