"use client";

import { useState } from "react";
import Image from "next/image";
import NavLinks from "./NavLinks";
import { logout } from "@/app/admin/actions";

export default function Sidebar() {
  const [buka, setBuka] = useState(false);
  const tutup = () => setBuka(false);

  return (
    <>
      {/* ===== HP: bar atas dengan tombol menu ===== */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-green-900 px-4 py-3 text-white md:hidden">
        <div className="flex items-center gap-2">
          <Image src="/img/logo_w.png" alt="Logo" width={32} height={32} className="size-8 object-contain" />
          <span className="font-[family-name:var(--font-display)] text-lg font-bold">SARPRAS</span>
        </div>
        <button
          type="button"
          onClick={() => setBuka(true)}
          aria-label="Buka menu"
          className="grid size-10 place-items-center rounded-xl hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {/* Latar gelap saat menu HP terbuka */}
      {buka && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={tutup} />}

      {/* ===== Sidebar =====
          Sengaja hanya padding kiri (pl-4), supaya menu aktif bisa menempel ke tepi kanan */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-green-900 pb-6 pl-4 pt-6 text-white transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          buka ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo + tombol tutup (HP) */}
        <div className="flex items-center justify-between pr-4">
          <div className="flex items-center gap-2">
            <Image
              src="/img/logo_w.png"
              alt="Logo SMK Assalam Gegesik"
              width={36}
              height={36}
              className="size-9 object-contain"
            />
            <div>
              <p className="font-[family-name:var(--font-display)] text-base font-bold leading-tight">
                SARPRAS
              </p>
              <p className="text-[10px] text-white/55">SMK Assalam Gegesik</p>
            </div>
          </div>
          <button
            type="button"
            onClick={tutup}
            aria-label="Tutup menu"
            className="grid size-9 place-items-center rounded-xl hover:bg-white/10 md:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Menu (py-5 memberi ruang untuk lengkungan menu aktif) */}
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto py-5">
          <NavLinks onNavigate={tutup} />
        </div>

        {/* Keluar */}
        <form action={logout} className="pr-4">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" />
            </svg>
            Keluar
          </button>
        </form>
      </aside>
    </>
  );
}