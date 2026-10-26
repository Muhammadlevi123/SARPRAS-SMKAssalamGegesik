"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BG_KONTEN } from "./theme";

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

const MENU = [
  {
    href: "/admin",
    label: "Dashboard",
    ready: true,
    ikon: ["M4 4h7v7H4z", "M13 4h7v4h-7z", "M13 10h7v10h-7z", "M4 13h7v7H4z"],
  },
  {
    href: "/admin/lokasi",
    label: "Lokasi",
    ready: false,
    ikon: [
      "M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z",
      "M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
    ],
  },
  {
    href: "/admin/barang",
    label: "Barang",
    ready: false,
    ikon: ["M21 8l-9-5-9 5 9 5 9-5z", "M3 8v8l9 5 9-5V8", "M12 13v8"],
  },
  {
    href: "/admin/barang-masuk",
    label: "Barang Masuk",
    ready: false,
    ikon: ["M12 3v12", "M7 10l5 5 5-5", "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"],
  },
  {
    href: "/admin/pengecekan",
    label: "Pengecekan",
    ready: false,
    ikon: [
      "M7 4h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
      "M9 3h6v3H9z",
      "M9 13l2 2 4-4",
    ],
  },
  {
    href: "/admin/mitra",
    label: "Mitra",
    ready: false,
    ikon: [
      "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
      "M3 20a6 6 0 0 1 12 0",
      "M17 11.5a2.5 2.5 0 1 0 0-5",
      "M16 14.2A5 5 0 0 1 21 19",
    ],
  },
  {
    href: "/admin/laporan",
    label: "Laporan",
    ready: false,
    ikon: ["M4 20h16", "M7 16v-5", "M12 16V7", "M17 16v-8"],
  },
];

export default function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {MENU.map((item) => {
        const aktif =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

        const base =
          "relative flex items-center gap-3 px-4 py-3 text-sm font-semibold transition";

        // Belum dibuat: redup, tidak bisa diklik
        if (!item.ready) {
          return (
            <span
              key={item.href}
              className={`${base} mr-4 cursor-not-allowed rounded-2xl text-white/35`}
            >
              <Ikon d={item.ikon} />
              <span className="flex-1 whitespace-nowrap">{item.label}</span>
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-medium">
                Segera
              </span>
            </span>
          );
        }

        // Menu aktif: di desktop menempel ke tepi kanan sidebar dan menyatu dengan konten
        if (aktif) {
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`${base} mr-4 rounded-2xl text-green-900 md:mr-0 md:rounded-r-none`}
              style={{ backgroundColor: BG_KONTEN }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -top-5 right-0 hidden size-5 rounded-br-[20px] md:block"
                style={{ boxShadow: `10px 10px 0 10px ${BG_KONTEN}` }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-5 right-0 hidden size-5 rounded-tr-[20px] md:block"
                style={{ boxShadow: `10px -10px 0 10px ${BG_KONTEN}` }}
              />
              <Ikon d={item.ikon} />
              {item.label}
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`${base} mr-4 rounded-2xl text-white/75 hover:bg-white/10 hover:text-white`}
          >
            <Ikon d={item.ikon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}