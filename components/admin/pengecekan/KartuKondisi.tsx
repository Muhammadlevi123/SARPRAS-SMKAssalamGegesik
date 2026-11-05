import { fmtAngka } from "@/lib/format";
import type { RekapKondisi } from "@/lib/stok";

export default function KartuKondisi({ rekap, judul }: { rekap: RekapKondisi; judul?: string }) {
  const kartu = [
    { label: "Baik", nilai: rekap.baik, cls: "bg-green-50 text-green-700" },
    { label: "Kurang Baik", nilai: rekap.kurang, cls: "bg-amber-50 text-amber-700" },
    { label: "Rusak Berat", nilai: rekap.rusak, cls: "bg-red-50 text-red-700" },
    { label: "Hilang", nilai: rekap.hilang, cls: "bg-gray-100 text-gray-700" },
  ];

  return (
    <section className="mb-4 sm:mb-5">
      {judul && <p className="mb-2 text-sm font-semibold text-gray-500">{judul}</p>}
      {/* HP: 2×2 ringkas. Layar lebar: 4 sejajar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {kartu.map((k) => (
          <div key={k.label} className={`min-w-0 rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 ${k.cls}`}>
            <p className="truncate text-xl font-bold sm:text-2xl">{fmtAngka(k.nilai)}</p>
            <p className="truncate text-xs font-semibold">{k.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}