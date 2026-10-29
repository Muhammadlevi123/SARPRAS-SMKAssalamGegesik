import Link from "next/link";

export default function Pagination({
  basePath,
  params,
  halaman,
  totalHalaman,
  total,
  perHalaman,
}: {
  basePath: string;
  params: Record<string, string | undefined>; // filter yang harus tetap ikut (q, urut, dll.)
  halaman: number;
  totalHalaman: number;
  total: number;
  perHalaman: number;
}) {
  if (total === 0) return null;

  const href = (h: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (h > 1) sp.set("halaman", String(h));
    const s = sp.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  const dari = (halaman - 1) * perHalaman + 1;
  const sampai = Math.min(total, halaman * perHalaman);

  // Nomor halaman: 1 … 4 5 6 … 12
  const nomor: (number | "…")[] = [];
  for (let i = 1; i <= totalHalaman; i++) {
    if (i === 1 || i === totalHalaman || Math.abs(i - halaman) <= 1) nomor.push(i);
    else if (nomor[nomor.length - 1] !== "…") nomor.push("…");
  }

  const kotak = "grid h-9 min-w-9 place-items-center rounded-lg px-3 text-sm font-semibold";

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-gray-500">
        Menampilkan <b className="text-gray-800">{dari}–{sampai}</b> dari <b className="text-gray-800">{total}</b> data
      </p>

      {totalHalaman > 1 && (
        <nav aria-label="Halaman" className="flex flex-wrap items-center gap-1">
          {halaman > 1 ? (
            <Link href={href(halaman - 1)} className={`${kotak} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50`}>
              ‹ Sebelumnya
            </Link>
          ) : (
            <span className={`${kotak} border border-gray-100 text-gray-300`}>‹ Sebelumnya</span>
          )}

          {nomor.map((n, i) =>
            n === "…" ? (
              <span key={`titik-${i}`} className="px-1 text-gray-400">…</span>
            ) : n === halaman ? (
              <span key={n} aria-current="page" className={`${kotak} bg-green-700 text-white`}>{n}</span>
            ) : (
              <Link key={n} href={href(n)} className={`${kotak} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50`}>
                {n}
              </Link>
            )
          )}

          {halaman < totalHalaman ? (
            <Link href={href(halaman + 1)} className={`${kotak} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50`}>
              Berikutnya ›
            </Link>
          ) : (
            <span className={`${kotak} border border-gray-100 text-gray-300`}>Berikutnya ›</span>
          )}
        </nav>
      )}
    </div>
  );
}