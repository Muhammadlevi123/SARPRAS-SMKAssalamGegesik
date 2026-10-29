export default function PageHeader({
  judul,
  deskripsi,
  aksi,
}: {
  judul: string;
  deskripsi?: string;
  aksi?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-gray-900">
          {judul}
        </h2>
        {deskripsi && <p className="mt-1 text-sm text-gray-500">{deskripsi}</p>}
      </div>
      {aksi}
    </div>
  );
}