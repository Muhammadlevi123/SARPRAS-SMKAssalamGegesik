export default function EmptyState({
  judul,
  pesan,
  children,
}: {
  judul: string;
  pesan?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-3xl border-2 border-dashed border-green-200 bg-white/50 px-6 py-14 text-center">
      <p className="font-semibold text-gray-700">{judul}</p>
      {pesan && <p className="mt-1 max-w-sm text-sm text-gray-500">{pesan}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}