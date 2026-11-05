"use client";

import { useEffect } from "react";

export default function Modal({
  judul,
  onClose,
  children,
}: {
  judul: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Tutup dengan tombol Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Kunci scroll halaman di belakang selama modal terbuka
  // (dipisah dari efek di atas supaya hanya jalan sekali saat buka & tutup)
  useEffect(() => {
    const overflowAwal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflowAwal;
    };
  }, []);

  return (
    // Lapisan gelap: yang di-scroll adalah lapisan ini (bukan isi modal),
    // supaya dropdown (Combobox/Select) di dalam modal tidak terpotong
    <div className="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden overscroll-contain bg-black/40" onClick={onClose}>
      {/* HP: menempel di bawah layar. Desktop: di tengah */}
      <div className="flex min-h-full items-end justify-center sm:items-center sm:p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={judul}
          className="w-full min-w-0 max-w-lg rounded-t-3xl bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-xl sm:rounded-3xl sm:p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Garis kecil penanda "sheet" (hanya HP) */}
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-200 sm:hidden" />

          <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
            <h3 className="text-lg font-bold text-gray-900">{judul}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="grid size-9 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-100"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}