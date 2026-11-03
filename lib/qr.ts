import "server-only";
import QRCode from "qrcode";

// Alamat website (dari .env). Contoh: https://sarpras.smkassalamgegesik.sch.id
const ALAMAT = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

// Isi QR = link halaman barang berdasarkan ID (tetap berlaku walaupun kode barang berubah)
export const linkBarang = (id: number) => `${ALAMAT}/b/${id}`;

// Gambar QR dalam bentuk SVG (tajam saat dicetak di ukuran berapa pun)
export function qrSvg(teks: string) {
  return QRCode.toString(teks, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
}