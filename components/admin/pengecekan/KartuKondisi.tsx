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
    <section className="mb-5">
      {judul && <p className="mb-2 text-sm font-semibold text-gray-500">{judul}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kartu.map((k) => (
          <div key={k.label} className={`rounded-2xl px-4 py-3 ${k.cls}`}>
            <p className="text-2xl font-bold">{fmtAngka(k.nilai)}</p>
            <p className="text-xs font-semibold">{k.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}