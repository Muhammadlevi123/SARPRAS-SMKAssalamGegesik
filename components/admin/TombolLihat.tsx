import Link from "next/link";

// Tombol ikon mata untuk membuka halaman detail.
// Dipakai di tabel Pengecekan, Barang Masuk, dll. supaya tampilannya seragam.
export default function TombolLihat({ href, judul = "Lihat detail" }: { href: string; judul?: string }) {
  return (
    <Link
      href={href}
      title={judul}
      aria-label={judul}
      className="rounded-lg p-2 text-gray-500 hover:bg-green-50 hover:text-green-700"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </Link>
  );
}