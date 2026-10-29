"use client";

import { useId, useRef, useState } from "react";
import { inputClass } from "@/components/admin/ui";

// Isian yang bisa diketik bebas sekaligus memilih dari daftar data sebelumnya
export default function Combobox({
  id,
  name,
  value,
  onChange,
  opsi,
  placeholder,
  required,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  opsi: string[];
  placeholder?: string;
  required?: boolean;
}) {
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  const [buka, setBuka] = useState(false);
  const [query, setQuery] = useState(""); // teks pencarian (kosong = tampilkan semua)
  const [aktif, setAktif] = useState(-1);

  const hasil = opsi.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()));
  const nilai = value.trim();
  const baru = nilai !== "" && !opsi.some((o) => o.toLowerCase() === nilai.toLowerCase());

  function pilih(v: string) {
    onChange(v);
    setBuka(false);
    setQuery("");
    setAktif(-1);
  }

  function gerak(i: number) {
    setAktif(i);
    listRef.current?.children[i]?.scrollIntoView({ block: "nearest" });
  }

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        value={value}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={buka}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => {
          onChange(e.target.value);
          setQuery(e.target.value);
          setBuka(true);
          setAktif(-1);
        }}
        onFocus={() => {
          setQuery("");
          setBuka(true);
        }}
        onBlur={() => setBuka(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setBuka(true);
            gerak(Math.min(aktif + 1, hasil.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            gerak(Math.max(aktif - 1, 0));
          } else if (e.key === "Enter" && buka && aktif >= 0 && hasil[aktif]) {
            e.preventDefault(); // pilih opsi, jangan kirim form
            pilih(hasil[aktif]);
          } else if (e.key === "Escape" && buka) {
            e.stopPropagation(); // tutup dropdown saja, modal jangan ikut tertutup
            setBuka(false);
          }
        }}
        className={`${inputClass} pr-10`}
      />

      <button
        type="button"
        tabIndex={-1}
        aria-label="Tampilkan pilihan"
        onMouseDown={(e) => {
          e.preventDefault(); // jangan sampai input kehilangan fokus
          setQuery("");
          setBuka((b) => !b);
        }}
        className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-gray-400 hover:text-gray-700"
      >
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
      </button>

      {buka && (hasil.length > 0 || baru) && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-green-100 bg-white shadow-lg [scrollbar-width:thin]"
        >
          {hasil.map((o, i) => (
            <li
              key={o}
              role="option"
              aria-selected={o === value}
              onMouseDown={(e) => {
                e.preventDefault();
                pilih(o);
              }}
              onMouseEnter={() => setAktif(i)}
              className={`flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm ${
                i === aktif ? "bg-green-50 text-green-800" : "text-gray-700"
              } ${o === value ? "font-semibold" : ""}`}
            >
              {o}
              {o === value && (
                <svg viewBox="0 0 24 24" className="size-4 text-green-700" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5L19 7" />
                </svg>
              )}
            </li>
          ))}
          {baru && (
            <li className="border-t border-gray-100 bg-gray-50 px-4 py-2.5 text-xs text-gray-500">
              Akan disimpan sebagai baru: <b className="text-gray-800">{nilai}</b>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}