"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BG_KONTEN } from "./theme";

type Item = { href: string; label: string; ikon: string[] };
type Grup = { judul?: string; items: Item[] };

// Warna siluet saat kursor di atas menu (sama dengan bg-white/10)
const WARNA_HOVER = "rgba(255, 255, 255, 0.1)";

function Ikon({ d }: { d: string[] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {d.map((p) => (
        <path key={p} d={p} />
      ))}
    </svg>
  );
}

// Lengkungan atas & bawah di sisi kanan menu, supaya menu terlihat "menyatu" ke tepi.
// Hanya area di luar lingkaran yang diwarnai, jadi warna transparan pun tidak belang.
function Lengkung({ warna, kelas }: { warna: string; kelas: string }) {
  return (
    <>
      <span
        aria-hidden
        className={`pointer-events-none absolute -top-5 right-0 size-5 ${kelas}`}
        style={{ background: `radial-gradient(circle at 0 0, transparent 19.5px, ${warna} 20px)` }}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute -bottom-5 right-0 size-5 ${kelas}`}
        style={{ background: `radial-gradient(circle at 0 100%, transparent 19.5px, ${warna} 20px)` }}
      />
    </>
  );
}

// Kelola User & Kelola Tahun Ajaran ada di menu profil (bawah sidebar), bukan di sini
const MENU: Grup[] = [
  {
    items: [
      { href: "/admin", label: "Dashboard", ikon: ["M4 4h7v7H4z", "M13 4h7v4h-7z", "M13 10h7v10h-7z", "M4 13h7v7H4z"] },
    ],
  },
  {
    judul: "Data Master",
    items: [
      {
        href: "/admin/lokasi",
        label: "Lokasi",
        ikon: ["M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z", "M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"],
      },
      { href: "/admin/barang", label: "Barang", ikon: ["M21 8l-9-5-9 5 9 5 9-5z", "M3 8v8l9 5 9-5V8", "M12 13v8"] },
      {
        href: "/admin/kategori",
        label: "Kategori",
        // Ikon label / tag
        ikon: ["M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z", "M7 7h.01"],
      },
      {
        href: "/admin/mitra",
        label: "Mitra",
        // Ikon jabat tangan (rekan kerja / pemasok)
        ikon: [
          "m11 17 2 2a1 1 0 1 0 3-3",
          "m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4",
          "m21 3 1 11h-2",
          "M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3",
          "M3 4h8",
        ],
      },
    ],
  },
  {
    judul: "Pencatatan",
    items: [
      {
        href: "/admin/barang-masuk",
        label: "Barang Masuk",
        ikon: ["M12 3v12", "M7 10l5 5 5-5", "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"],
      },
      {
        href: "/admin/pengecekan",
        label: "Pengecekan",
        ikon: ["M7 4h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", "M9 3h6v3H9z", "M9 13l2 2 4-4"],
      },
      {
        href: "/admin/pengajuan",
        label: "Pengajuan",
        // Ikon pesan terkirim
        ikon: ["M22 2 11 13", "M22 2 15 22 11 13 2 9 22 2z"],
      },
    ],
  },
  {
    judul: "Lainnya",
    items: [{ href: "/admin/laporan", label: "Laporan", ikon: ["M4 20h16", "M7 16v-5", "M12 16V7", "M17 16v-8"] }],
  },
];

export default function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  // Tanpa "transition": latar menu dan lengkungannya berubah bersamaan
  const base = "relative flex items-center gap-3 px-4 py-3 text-sm font-semibold";

  function renderItem(item: Item) {
    // Aktif jika alamatnya sama persis, atau sub-halamannya (misal /admin/pengecekan/5)
    const aktif =
      item.href === "/admin"
        ? pathname === "/admin"
        : pathname === item.href || pathname.startsWith(`${item.href}/`);

    // Menu aktif: menempel ke tepi kanan dan menyatu dengan area konten
    if (aktif) {
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={`${base} mr-4 rounded-2xl text-green-900 md:mr-0 md:rounded-r-none`}
          style={{ backgroundColor: BG_KONTEN }}
        >
          <Lengkung warna={BG_KONTEN} kelas="hidden md:block" />
          <Ikon d={item.ikon} />
          {item.label}
        </Link>
      );
    }

    // Menu biasa: saat kursor di atasnya, muncul siluet putih transparan
    // dengan bentuk yang sama seperti menu aktif (di desktop)
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={`${base} group mr-4 rounded-2xl text-white/75 hover:bg-white/10 hover:text-white md:hover:mr-0 md:hover:rounded-r-none`}
      >
        <Lengkung warna={WARNA_HOVER} kelas="hidden md:group-hover:block" />
        <Ikon d={item.ikon} />
        {item.label}
      </Link>
    );
  }

  return (
    <nav className="flex flex-col gap-4">
      {MENU.map((grup, i) => (
        <div key={grup.judul ?? i} className="flex flex-col gap-1">
          {grup.judul && (
            <p className="mb-1 px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">{grup.judul}</p>
          )}
          {grup.items.map(renderItem)}
        </div>
      ))}
    </nav>
  );
}