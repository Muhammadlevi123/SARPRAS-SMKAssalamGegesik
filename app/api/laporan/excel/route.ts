import { requireUser } from "@/lib/auth";
import { bacaFilter } from "@/lib/laporan/filter";
import { buatExcel } from "@/lib/laporan/excel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Download Excel (.xlsx) dengan filter yang sama seperti Cetak / PDF
export async function GET(req: Request) {
  await requireUser();

  const f = await bacaFilter(new URL(req.url).searchParams);
  if (!f) return new Response("Filter laporan tidak valid", { status: 400 });

  const isi = await buatExcel(f);

  return new Response(isi, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="laporan.xlsx"; filename*=UTF-8''${encodeURIComponent(f.namaFile)}.xlsx`,
    },
  });
}