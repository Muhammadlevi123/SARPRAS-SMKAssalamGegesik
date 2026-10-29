"use client";

import { btnPrimary } from "@/components/admin/ui";

export default function TombolCetak() {
  return (
    <button type="button" onClick={() => window.print()} className={btnPrimary}>
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M7 14h10v7H7z" />
      </svg>
      Cetak / Simpan PDF
    </button>
  );
}