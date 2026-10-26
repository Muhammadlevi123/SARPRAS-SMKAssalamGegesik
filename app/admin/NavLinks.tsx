"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU = [
  { href: "/admin", label: "Dashboard", ready: true },
  { href: "/admin/barang", label: "Barang", ready: false },
  { href: "/admin/pengecekan", label: "Pengecekan", ready: false },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 md:flex-col">
      {MENU.map((item) => {
        // Dashboard hanya aktif di /admin persis; menu lain aktif juga di sub-halamannya
        const aktif =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);

        const base =
          "flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold transition";

        // Halaman yang belum dibuat: tampil redup dan belum bisa diklik
        if (!item.ready) {
          return (
            <span key={item.href} className={`${base} cursor-not-allowed text-white/40`}>
              {item.label}
              <span className="hidden rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium md:inline">
                Segera
              </span>
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${base} ${
              aktif
                ? "bg-white text-green-800"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}