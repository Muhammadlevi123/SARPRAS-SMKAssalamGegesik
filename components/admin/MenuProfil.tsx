"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/admin/actions";

const MENU = [
  {
    href: "/admin/user",
    label: "Kelola User",
    ikon: ["M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M3 20a6 6 0 0 1 12 0", "M17 11.5a2.5 2.5 0 1 0 0-5", "M16 14.2A5 5 0 0 1 21 19"],
  },
  {
    href: "/admin/tahun-ajaran",
    label: "Kelola Tahun Ajaran",
    ikon: ["M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z", "M4 10h16", "M8 3v4", "M16 3v4"],
  },
];

function Ikon({ d }: { d: string[] }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.map((p) => (
        <path key={p} d={p} />
      ))}
    </svg>
  );
}

function Inisial({ nama, className }: { nama: string; className: string }) {
  return (
    <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-base font-semibold ${className}`}>
      {nama.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

const itemClass =
  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900";

export default function MenuProfil({
  nama,
  email,
  onNavigate,
}: {
  nama: string;
  email: string;
  onNavigate?: () => void; // menutup sidebar di HP setelah pindah halaman
}) {
  const [buka, setBuka] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Tutup saat klik di luar menu atau tekan Esc
  useEffect(() => {
    if (!buka) return;
    const klikLuar = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setBuka(false);
    };
    const tombolEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBuka(false);
    };
    document.addEventListener("mousedown", klikLuar);
    document.addEventListener("keydown", tombolEsc);
    return () => {
      document.removeEventListener("mousedown", klikLuar);
      document.removeEventListener("keydown", tombolEsc);
    };
  }, [buka]);

  const pilih = () => {
    setBuka(false);
    onNavigate?.();
  };

  return (
    <div ref={ref} className="relative pr-4">
      {/* Menu yang muncul ke atas */}
      {buka && (
        <div role="menu" className="absolute bottom-full left-0 right-4 z-10 mb-2 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
          <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
            <Inisial nama={nama} className="bg-gray-100 text-gray-900" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900">{nama}</p>
              <p className="truncate text-xs text-gray-500">{email}</p>
            </div>
          </div>

          <div className="p-1.5">
            {MENU.map((m) => (
              <Link key={m.href} href={m.href} role="menuitem" onClick={pilih} className={itemClass}>
                <Ikon d={m.ikon} />
                {m.label}
              </Link>
            ))}
          </div>

          <form action={logout} className="border-t border-gray-100 p-1.5">
            <button type="submit" role="menuitem" className={itemClass}>
              <Ikon d={["M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3", "M10 16l-4-4 4-4", "M6 12h10"]} />
              Keluar
            </button>
          </form>
        </div>
      )}

      {/* Tombol profil di bawah sidebar.
          Normal: menyatu dengan warna sidebar. Disorot mouse / menu terbuka: putih transparan */}
      <button
        type="button"
        onClick={() => setBuka((b) => !b)}
        aria-haspopup="menu"
        aria-expanded={buka}
        className={`flex w-full items-center gap-3 rounded-2xl p-2 text-left text-white transition ${
          buka ? "bg-white/10" : "hover:bg-white/10"
        }`}
      >
        <Inisial nama={nama} className="bg-white/15" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{nama}</span>
        <svg viewBox="0 0 24 24" className="mr-1 size-4 shrink-0 text-white/70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
        </svg>
      </button>
    </div>
  );
}