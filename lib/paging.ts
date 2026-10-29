export const PER_HALAMAN = 10;

// ?halaman=2 → 2. Nilai aneh/kosong → 1
export function bacaHalaman(v?: string) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

// ===== Urutan data =====
export type Urut = "terbaru" | "az" | "za";

export const OPSI_URUT: { value: Urut; label: string }[] = [
  { value: "terbaru", label: "Terbaru ditambahkan" },
  { value: "az", label: "Nama A–Z" },
  { value: "za", label: "Nama Z–A" },
];

export function bacaUrut(v?: string): Urut {
  return v === "az" || v === "za" ? v : "terbaru";
}

// Dipakai untuk tabel yang punya kolom nama, createdAt, dan id (Lokasi, Barang, Mitra)
export function orderByNama(urut: Urut) {
  if (urut === "az") return [{ nama: "asc" as const }, { id: "asc" as const }];
  if (urut === "za") return [{ nama: "desc" as const }, { id: "desc" as const }];
  return [{ createdAt: "desc" as const }, { id: "desc" as const }]; // terbaru di nomor 1
}