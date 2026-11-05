import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// Foto nota disimpan di <project>/uploads/nota (bukan di public, supaya tidak bisa diakses tanpa login)
const FOLDER = path.join(process.cwd(), "uploads", "nota");
const MAKS_BYTE = 1024 * 1024; // 1 MB (foto sudah dikecilkan di browser, biasanya ±300–500 KB)

export const namaFotoValid = (nama: string) => /^[a-f0-9-]{36}\.jpg$/.test(nama);
export const pathFoto = (nama: string) => path.join(FOLDER, nama);

export async function simpanFotoNota(file: File): Promise<{ nama: string } | { error: string }> {
  if (file.type !== "image/jpeg") return { error: "Format foto tidak didukung" };
  if (file.size > MAKS_BYTE) return { error: "Ukuran foto terlalu besar (maks. 1 MB setelah dikecilkan)" };

  const isi = Buffer.from(await file.arrayBuffer());
  // file.type bisa dipalsukan → cek isi aslinya: file JPEG selalu diawali byte FF D8 FF
  if (isi.length < 3 || isi[0] !== 0xff || isi[1] !== 0xd8 || isi[2] !== 0xff) {
    return { error: "File bukan foto JPEG" };
  }

  await mkdir(FOLDER, { recursive: true });
  const nama = `${randomUUID()}.jpg`;
  await writeFile(pathFoto(nama), isi);
  return { nama };
}

export async function hapusFotoNota(nama: string) {
  if (!namaFotoValid(nama)) return;
  try {
    await unlink(pathFoto(nama));
  } catch {
    // file sudah tidak ada, abaikan
  }
}