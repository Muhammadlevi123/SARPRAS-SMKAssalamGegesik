// Peran user. Bisa dipakai di server maupun client.
//   ADMIN : semua fitur + Kelola User + Kelola Tahun Ajaran
//   USER  : fitur harian (data master, barang masuk, pengecekan, laporan)
export const ROLE_LABEL = { ADMIN: "Admin", USER: "User" } as const;

export type Role = keyof typeof ROLE_LABEL;

export const isRole = (v: unknown): v is Role => typeof v === "string" && v in ROLE_LABEL;