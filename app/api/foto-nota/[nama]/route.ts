import { readFile } from "node:fs/promises";
import { getSession } from "@/lib/session";
import { namaFotoValid, pathFoto } from "@/lib/fotoNota";

export async function GET(_req: Request, { params }: { params: Promise<{ nama: string }> }) {
  if (!(await getSession())) return new Response("Tidak diizinkan", { status: 401 });

  const { nama } = await params;
  if (!namaFotoValid(nama)) return new Response("Tidak ditemukan", { status: 404 });

  try {
    const data = await readFile(pathFoto(nama));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Tidak ditemukan", { status: 404 });
  }
}