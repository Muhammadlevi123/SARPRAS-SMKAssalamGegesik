"use client";

import { useEffect, useState } from "react";

type Jenis = "sukses" | "gagal";
type Notif = { id: number; pesan: string; jenis: Jenis };

const EVENT = "sarpras:toast";
let idBerikut = 1;

// Panggil dari komponen client mana saja: toast("Data tersimpan") / toast("Gagal", "gagal")
export function toast(pesan: string, jenis: Jenis = "sukses") {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { pesan, jenis } }));
}

// Dipasang sekali di app/admin/layout.tsx
export default function Toaster() {
  const [daftar, setDaftar] = useState<Notif[]>([]);

  useEffect(() => {
    const tangkap = (e: Event) => {
      const { pesan, jenis } = (e as CustomEvent<{ pesan: string; jenis: Jenis }>).detail;
      const id = idBerikut++;
      setDaftar((d) => [...d, { id, pesan, jenis }]);
      setTimeout(() => setDaftar((d) => d.filter((n) => n.id !== id)), 3500);
    };
    window.addEventListener(EVENT, tangkap);
    return () => window.removeEventListener(EVENT, tangkap);
  }, []);

  const tutup = (id: number) => setDaftar((d) => d.filter((n) => n.id !== id));

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-4 z-[70] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 print:hidden"
    >
      {daftar.map((n) => (
        <div
          key={n.id}
          role="status"
          className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white px-4 py-3 shadow-lg ${
            n.jenis === "sukses" ? "border-green-200" : "border-red-200"
          }`}
        >
          <span
            className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-white ${
              n.jenis === "sukses" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={n.jenis === "sukses" ? "M5 12l5 5L19 7" : "M6 6l12 12M18 6L6 18"} />
            </svg>
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">{n.jenis === "sukses" ? "Berhasil" : "Gagal"}</p>
            <p className="text-sm text-gray-600">{n.pesan}</p>
          </div>
          <button
            type="button"
            onClick={() => tutup(n.id)}
            aria-label="Tutup notifikasi"
            className="text-gray-400 hover:text-gray-700"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}