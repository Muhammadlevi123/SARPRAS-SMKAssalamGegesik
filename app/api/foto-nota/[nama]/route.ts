import { readFile } from "node:fs/promises";
import { userDariSesi } from "@/lib/auth";
import { namaFotoValid, pathFoto } from "@/lib/fotoNota";

export async function GET(_req: Request, { params }: { params: Promise<{ nama: string }> }) {
  // Cek ke database: akun dihapus / sesi dicabut / menunggu persetujuan → ditolak
  if (!(await userDariSesi())) return new Response("Tidak diizinkan", { status: 401 });

  const { nama } = await params;
  if (!namaFotoValid(nama)) return new Response("Tidak ditemukan", { status: 404 });

  try {
    const data = await readFile(pathFoto(nama));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/jpeg",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Tidak ditemukan", { status: 404 });
  }
}