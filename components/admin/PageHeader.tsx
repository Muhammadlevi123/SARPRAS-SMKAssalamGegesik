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
    // HP: judul di atas, tombol aksi lebar penuh di bawahnya.
    // Layar lebar: judul kiri, tombol kanan (seperti semula)
    <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h2 className="font-(family-name:--font-display) break-words text-xl font-bold text-gray-900 sm:text-2xl">
          {judul}
        </h2>
        {deskripsi && <p className="mt-1 text-sm text-gray-500">{deskripsi}</p>}
      </div>

      {/* *:w-full → isi aksi (tombol / link / grid) selebar layar di HP */}
      {aksi && <div className="w-full *:w-full sm:w-auto sm:*:w-auto">{aksi}</div>}
    </div>
  );
}