"use client";

import { useEffect, useId, useRef, useState } from "react";
import { inputClass } from "@/components/admin/ui";

const TINGGI_IDEAL = 224; // px, tinggi maksimal daftar
const JARAK_TEPI = 12; // px, jarak aman dari tepi layar

// Isian yang bisa diketik bebas sekaligus memilih dari daftar data sebelumnya.
// Daftar otomatis terbuka ke atas kalau ruang di bawah tidak cukup.
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
  const wadahRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [buka, setBuka] = useState(false);
  const [query, setQuery] = useState("");
  const [aktif, setAktif] = useState(-1);
  const [posisi, setPosisi] = useState({ keAtas: false, tinggi: TINGGI_IDEAL });

  const hasil = opsi.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()));
  const nilai = value.trim();
  const baru = nilai !== "" && !opsi.some((o) => o.toLowerCase() === nilai.toLowerCase());

  // Ukur ruang di atas & bawah, pilih arah yang lebih lega
  function hitungPosisi() {
    const r = wadahRef.current?.getBoundingClientRect();
    if (!r) return;
    const ruangBawah = window.innerHeight - r.bottom - JARAK_TEPI;
    const ruangAtas = r.top - JARAK_TEPI;
    const keAtas = ruangBawah < Math.min(TINGGI_IDEAL, 180) && ruangAtas > ruangBawah;
    const tinggi = Math.max(120, Math.min(TINGGI_IDEAL, keAtas ? ruangAtas : ruangBawah));
    setPosisi({ keAtas, tinggi });
  }

  useEffect(() => {
    if (!buka) return;
    window.addEventListener("resize", hitungPosisi);
    window.addEventListener("scroll", hitungPosisi, true);
    return () => {
      window.removeEventListener("resize", hitungPosisi);
      window.removeEventListener("scroll", hitungPosisi, true);
    };
  }, [buka]);

  function bukaDaftar() {
    hitungPosisi();
    setBuka(true);
  }

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
    <div ref={wadahRef} className="relative">
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
          if (!buka) bukaDaftar();
          setAktif(-1);
        }}
        onFocus={() => {
          setQuery("");
          bukaDaftar();
        }}
        onBlur={() => setBuka(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!buka) bukaDaftar();
            gerak(Math.min(aktif + 1, hasil.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            gerak(Math.max(aktif - 1, 0));
          } else if (e.key === "Enter" && buka && aktif >= 0 && hasil[aktif]) {
            e.preventDefault();
            pilih(hasil[aktif]);
          } else if (e.key === "Escape" && buka) {
            e.stopPropagation();
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
          e.preventDefault();
          setQuery("");
          if (buka) setBuka(false);
          else bukaDaftar();
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
          style={{ maxHeight: posisi.tinggi }}
          className={`absolute z-30 w-full overflow-auto rounded-xl border border-green-100 bg-white shadow-lg [scrollbar-width:thin] ${
            posisi.keAtas ? "bottom-full mb-1" : "top-full mt-1"
          }`}
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