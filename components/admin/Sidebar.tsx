"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import NavLinks from "./NavLinks";
import MenuProfil from "./MenuProfil";

export default function Sidebar({
  user,
  jenis = "admin",
}: {
  user: { nama: string; email: string };
  jenis?: "admin" | "user"; // menu yang ditampilkan. Admin layout tidak perlu mengisi ini
}) {
  const [buka, setBuka] = useState(false);
  const tutup = () => setBuka(false);

  // Selama menu HP terbuka: kunci scroll halaman + tutup dengan tombol Esc
  useEffect(() => {
    if (!buka) return;

    const overflowAwal = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const tekanTombol = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBuka(false);
    };
    window.addEventListener("keydown", tekanTombol);

    return () => {
      document.body.style.overflow = overflowAwal;
      window.removeEventListener("keydown", tekanTombol);
    };
  }, [buka]);

  // Layar jadi lebar (HP diputar / jendela diperbesar) → tutup menu HP
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const cek = () => {
      if (desktop.matches) setBuka(false);
    };
    desktop.addEventListener("change", cek);
    return () => desktop.removeEventListener("change", cek);
  }, []);

  return (
    <>
      {/* ===== HP: bar atas dengan tombol menu (disembunyikan saat dicetak) ===== */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-green-900 px-4 py-3 text-white md:hidden print:hidden">
        <div className="flex items-center gap-2">
          <Image src="/img/logo_w.png" alt="Logo" width={32} height={32} className="size-8 object-contain" />
          <span className="font-(family-name:--font-display) text-lg font-bold">SARPRAS</span>
        </div>
        <button
          type="button"
          onClick={() => setBuka(true)}
          aria-label="Buka menu"
          aria-expanded={buka}
          aria-controls="sidebar-admin"
          className="grid size-10 place-items-center rounded-xl active:bg-white/15"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {/* Latar gelap saat menu HP terbuka */}
      {buka && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden print:hidden"
          onClick={tutup}
          aria-hidden="true"
        />
      )}

      {/* ===== Sidebar (disembunyikan saat dicetak) =====
          HP     : lebar 288px (maks 85% layar), tinggi = layar yang terlihat, susunan rapat
          Desktop: lebar 256px, seperti semula
          Susunan: logo (tetap) → daftar menu (bisa di-scroll) → akun (tetap di bawah).
          Sengaja hanya padding kiri (pl-4), supaya menu aktif bisa menempel ke tepi kanan */}
      <aside
        id="sidebar-admin"
        className={`print:hidden fixed left-0 top-0 z-50 flex h-dvh w-72 max-w-[85vw] flex-col bg-green-900 pb-[max(1rem,env(safe-area-inset-bottom))] pl-4 pt-5 text-white transition-transform duration-200 md:sticky md:h-screen md:w-64 md:max-w-none md:translate-x-0 md:pb-6 md:pt-6 ${
          buka ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo + tombol tutup (HP) */}
        <div className="flex shrink-0 items-center justify-between pr-4">
          <div className="flex items-center gap-2">
            <Image
              src="/img/logo_w.png"
              alt="Logo SMK Assalam Gegesik"
              width={36}
              height={36}
              className="size-9 object-contain"
            />
            <div>
              <p className="font-(family-name:--font-display) text-base font-bold leading-tight">SARPRAS</p>
              <p className="text-[10px] text-white/55">SMK Assalam Gegesik</p>
            </div>
          </div>
          <button
            type="button"
            onClick={tutup}
            aria-label="Tutup menu"
            className="grid size-9 place-items-center rounded-xl active:bg-white/15 md:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Daftar menu: HANYA bagian ini yang di-scroll.
            HP: lebih naik (mt-4, py-2). Desktop: py-5 memberi ruang untuk lengkungan menu aktif */}
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain py-2 md:mt-6 md:py-5">
          <NavLinks onNavigate={tutup} jenis={jenis} />
        </div>

        {/* Akun: tetap di bawah sidebar */}
        <div className="shrink-0 pt-2 md:pt-0">
          <MenuProfil nama={user.nama} email={user.email} onNavigate={tutup} admin={jenis === "admin"} />
        </div>
      </aside>
    </>
  );
}