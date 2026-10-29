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

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={judul}
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{judul}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid size-9 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}