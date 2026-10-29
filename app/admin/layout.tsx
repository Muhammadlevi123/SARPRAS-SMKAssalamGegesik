import Sidebar from "@/components/admin/Sidebar";
import Toaster from "@/components/admin/Toaster";
import { BG_KONTEN } from "@/components/admin/theme";
import { requireUser } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(); // belum login → dilempar ke /login

  const hariIni = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

  return (
    <div className="min-h-screen bg-green-900 md:flex print:block print:bg-white">
      <Sidebar />

      {/* print-putih: latar jadi putih saat dicetak (diatur di globals.css) */}
      <div
        className="print-putih flex min-h-screen min-w-0 flex-1 flex-col"
        style={{ backgroundColor: BG_KONTEN }}
      >
        <header className="border-b border-green-100 bg-white px-6 py-4 md:sticky md:top-0 md:z-20 md:px-8 print:hidden">
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-gray-900 md:text-2xl">
            Selamat datang, {user.nama}!
          </h1>
          <p className="text-sm text-gray-500">{hariIni}</p>
        </header>

        <main className="flex-1 p-6 md:p-8 print:p-0">{children}</main>
      </div>

      <Toaster />
    </div>
  );
}