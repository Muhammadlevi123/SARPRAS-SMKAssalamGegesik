"use client";

import { useId, useRef, useState } from "react";
import { inputClass } from "@/components/admin/ui";

// keterangan: teks kecil di bawah label (misal nama lokasi), ikut bisa dicari
export type OpsiSelect = { value: string; label: string; keterangan?: string };

// Dropdown pilihan (tidak bisa isi nilai baru), tampilannya sama dengan Combobox.
// bisaCari = true  → bisa mengetik untuk mencari (cocok untuk daftar panjang)
// bisaCari = false → hanya klik/pilih (cocok untuk daftar pendek)
export default function Select({
  id,
  name,
  value,
  onChange,
  opsi,
  placeholder = "Pilih...",
  required,
  bisaCari = true,
  className = "",
  ariaLabel,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  opsi: OpsiSelect[];
  placeholder?: string;
  required?: boolean;
  bisaCari?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  const [buka, setBuka] = useState(false);
  const [ketik, setKetik] = useState(false);
  const [query, setQuery] = useState("");
  const [aktif, setAktif] = useState(-1);

  const terpilih = opsi.find((o) => o.value === value);
  const tampil = terpilih ? (terpilih.keterangan ? `${terpilih.label} — ${terpilih.keterangan}` : terpilih.label) : "";

  const kata = query.trim().toLowerCase();
  const hasil = ketik
    ? opsi.filter((o) => `${o.label} ${o.keterangan ?? ""}`.toLowerCase().includes(kata))
    : opsi;

  function bukaDaftar() {
    setBuka(true);
    setKetik(false);
    setQuery("");
    setAktif(Math.max(0, opsi.findIndex((o) => o.value === value)));
  }

  function tutup() {
    setBuka(false);
    setKetik(false);
    setQuery("");
    setAktif(-1);
  }

  function pilih(o: OpsiSelect) {
    onChange(o.value);
    tutup();
  }

  function gerak(i: number) {
    setAktif(i);
    listRef.current?.children[i]?.scrollIntoView({ block: "nearest" });
  }

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        aria-label={ariaLabel}
        value={buka && ketik ? query : tampil}
        placeholder={placeholder}
        required={required}
        readOnly={!bisaCari}
        autoComplete="off"
        role="combobox"
        aria-expanded={buka}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => {
          if (!bisaCari) return;
          setQuery(e.target.value);
          setKetik(true);
          setBuka(true);
          setAktif(0);
        }}
        onFocus={bukaDaftar}
        onClick={() => {
          if (!buka) bukaDaftar();
        }}
        onBlur={tutup}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!buka) bukaDaftar();
            else gerak(Math.min(aktif + 1, hasil.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            gerak(Math.max(aktif - 1, 0));
          } else if (e.key === "Enter" && buka && hasil[aktif]) {
            e.preventDefault();
            pilih(hasil[aktif]);
          } else if (e.key === "Escape" && buka) {
            e.stopPropagation();
            tutup();
          }
        }}
        className={`${inputClass} cursor-pointer truncate pr-10`}
      />

      <input type="hidden" name={name} value={value} />

      <span className="pointer-events-none absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center text-gray-400">
        <svg
          viewBox="0 0 24 24"
          className={`size-4 transition-transform ${buka ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>

      {buka && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-green-100 bg-white shadow-lg [scrollbar-width:thin]"
        >
          {hasil.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-gray-400">Tidak ditemukan</li>
          ) : (
            hasil.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pilih(o);
                }}
                onMouseEnter={() => setAktif(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-sm ${
                  i === aktif ? "bg-green-50 text-green-800" : "text-gray-700"
                }`}
              >
                <span className="min-w-0">
                  <span className={`block truncate ${o.value === value ? "font-semibold" : ""}`}>{o.label}</span>
                  {o.keterangan && <span className="block truncate text-xs text-gray-400">{o.keterangan}</span>}
                </span>
                {o.value === value && (
                  <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-green-700" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5L19 7" />
                  </svg>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}