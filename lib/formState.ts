// Bentuk hasil yang dikembalikan semua server action form
export type FormState = {
  error?: string;
  ok?: boolean;
  pesan?: string; // pesan sukses untuk notifikasi
};