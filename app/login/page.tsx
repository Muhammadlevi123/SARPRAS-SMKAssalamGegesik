import Image from "next/image";
import { redirect } from "next/navigation";
import LoginForm from "@/components/login/loginForm";
import WaveEdge from "@/components/login/waveEdge";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const LINKS = {
  facebook: "https://www.facebook.com/smkassalamgegesik2003",
  instagram: "https://www.instagram.com/smkassalamgegesikcirebon",
  youtube: "https://www.youtube.com/@smkassalamgegesik",
  website: "https://www.smkassalamgegesik.sch.id",
};

function Sosmed({ dark = false }: { dark?: boolean }) {
  const cls = dark
    ? "text-green-700 hover:bg-green-50 border-green-200"
    : "text-white hover:bg-white/15 border-white/30";
  const item = `grid size-10 place-items-center rounded-full border transition ${cls}`;

  return (
    <div className="flex items-center justify-center gap-3">
      <a href={LINKS.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className={item}>
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </a>
      <a href={LINKS.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className={item}>
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      </a>
      <a href={LINKS.youtube} target="_blank" rel="noreferrer" aria-label="YouTube" className={item}>
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 8.2c0-1.2-.9-2.2-2-2.4C18.2 5.5 12 5.5 12 5.5s-6.2 0-8 .3c-1.1.2-2 1.2-2 2.4v7.6c0 1.2.9 2.2 2 2.4 1.8.3 8 .3 8 .3s6.2 0 8-.3c1.1-.2 2-1.2 2-2.4V8.2z" />
          <path d="M10 9.5v5l4.5-2.5L10 9.5z" fill="currentColor" stroke="none" />
        </svg>
      </a>
    </div>
  );
}

export default async function LoginPage() {
  // Sudah login DAN akunnya masih ada di database → langsung ke panel admin.
  // Kalau cookie masih ada tapi akunnya sudah dihapus, form tetap ditampilkan
  // (mencegah redirect bolak-balik antara /login dan /admin).
  const session = await getSession();
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true },
    });
    if (user) redirect("/admin");
  }

  return (
    <div className="flex min-h-screen flex-col bg-white md:flex-row">
      {/* ===== HP: header hijau ===== */}
      <header className="relative bg-gradient-to-b from-green-900 via-green-800 to-green-700 px-6 pb-24 pt-10 text-center text-white md:hidden">
        <div className="mt-4 flex flex-col items-center gap-2">
          <Image
            src="/img/logo_w.png"
            alt="Logo SMK Assalam Gegesik"
            width={80}
            height={80}
            className="size-20 object-contain drop-shadow-[0_0_14px_rgba(255,255,255,0.3)]"
            priority
          />
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">
            SARPRAS
          </h1>
        </div>

        {/* tepi awan (diputar jadi horizontal di bawah header) */}
        <WaveEdge variant="bottom" />
      </header>

      {/* ===== Desktop: panel kiri hijau ===== */}
      <aside className="relative hidden w-[48%] overflow-hidden bg-gradient-to-br from-green-900 via-green-800 to-green-600 md:flex">
        <div className="relative z-10 flex w-full flex-col items-center py-10 pl-12 pr-28 text-center text-white">
          <div className="my-auto flex flex-col items-center gap-4">
            <Image
              src="/img/logo_w.png"
              alt="Logo SMK Assalam Gegesik"
              width={140}
              height={140}
              className="size-36 object-contain drop-shadow-[0_0_18px_rgba(255,255,255,0.3)]"
              priority
            />
            <h1 className="font-[family-name:var(--font-display)] text-5xl font-bold leading-tight">
              SARPRAS
            </h1>
            <p className="max-w-sm text-sm leading-relaxed text-white/80">
              Sistem pencatatan sarana dan prasarana untuk barang masuk di
              SMK Assalam Gegesik.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <Sosmed />
            <div className="flex items-center gap-3 text-[11px] text-white/60">
              <a href={LINKS.website} className="font-semibold uppercase tracking-widest hover:text-white">
                Website SMK
              </a>
              <span className="text-white/30">|</span>
              <span>© 2026 SMK Assalam Gegesik</span>
            </div>
          </div>
        </div>

        {/* tepi awan (vertikal di sisi kanan panel) */}
        <WaveEdge />
      </aside>

      {/* ===== Form ===== */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-10 md:px-16">
        <div className="w-full max-w-[520px]">
          <div className="mb-10 text-center md:text-left">
            <span className="mb-3 block text-xs font-bold uppercase tracking-[0.16em] text-green-600">
              Portal Sarpras
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold text-gray-900 md:text-5xl">
              Masuk ke Akun
            </h2>
            <p className="mt-3 text-base text-gray-500">
              Gunakan username dan password yang telah didaftarkan
            </p>
          </div>
          <LoginForm />
        </div>

        <div className="mt-10 md:hidden">
          <Sosmed dark />
          <p className="mt-4 text-center text-[11px] text-gray-400">
            © 2026 SMK Assalam Gegesik
          </p>
        </div>
      </main>
    </div>
  );
}