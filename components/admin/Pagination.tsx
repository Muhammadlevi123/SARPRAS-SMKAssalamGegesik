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

  // HP: kotak ringkas (px-2). Layar lebar: seperti semula (px-3)
  const kotak = "grid h-10 min-w-9 place-items-center rounded-lg px-2 text-sm font-semibold sm:h-9 sm:px-3";
  const aktifLink = `${kotak} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100`;
  const mati = `${kotak} border border-gray-100 text-gray-300`;

  return (
    // HP: info di atas, tombol halaman di bawah (rata tengah). Layar lebar: kiri-kanan
    <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <p className="text-center text-sm text-gray-500">
        Menampilkan <b className="text-gray-800">{dari}–{sampai}</b> dari <b className="text-gray-800">{total}</b> data
      </p>

      {totalHalaman > 1 && (
        <nav aria-label="Halaman" className="flex flex-wrap items-center justify-center gap-1">
          {/* HP: hanya "‹". Layar lebar: "‹ Sebelumnya" */}
          {halaman > 1 ? (
            <Link href={href(halaman - 1)} aria-label="Halaman sebelumnya" className={aktifLink}>
              <span>
                ‹<span className="hidden sm:inline"> Sebelumnya</span>
              </span>
            </Link>
          ) : (
            <span aria-hidden className={mati}>
              <span>
                ‹<span className="hidden sm:inline"> Sebelumnya</span>
              </span>
            </span>
          )}

          {nomor.map((n, i) =>
            n === "…" ? (
              <span key={`titik-${i}`} className="px-0.5 text-gray-400 sm:px-1">…</span>
            ) : n === halaman ? (
              <span key={n} aria-current="page" className={`${kotak} bg-green-700 text-white`}>{n}</span>
            ) : (
              <Link key={n} href={href(n)} className={aktifLink}>
                {n}
              </Link>
            )
          )}

          {/* HP: hanya "›". Layar lebar: "Berikutnya ›" */}
          {halaman < totalHalaman ? (
            <Link href={href(halaman + 1)} aria-label="Halaman berikutnya" className={aktifLink}>
              <span>
                <span className="hidden sm:inline">Berikutnya </span>›
              </span>
            </Link>
          ) : (
            <span aria-hidden className={mati}>
              <span>
                <span className="hidden sm:inline">Berikutnya </span>›
              </span>
            </span>
          )}
        </nav>
      )}
    </div>
  );
}