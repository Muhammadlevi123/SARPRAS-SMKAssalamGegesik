import type { CSSProperties } from "react";
import { fmtTanggal } from "@/lib/format";

/* =========================================================
 * KOP SURAT — disamakan dengan file "KOP SEKOLAH.docx"
 *
 * Ukuran di file Word:
 *   Baris 1  YAYASAN AS SALAM GEGESIK          Calibri Light 28pt, tebal
 *   Baris 2  SEKOLAH MENENGAH KEJURUAN ...      Arial 13pt, tebal
 *   Baris 3  SMK PUSAT KEUNGGULAN              Arial 14pt, tebal
 *   Baris 4  Alamat ...                        Arial 9pt
 *   Baris 5  Website ... Email ...             Arial 12pt (email biru bergaris bawah)
 *   Baris 6  1. Teknik Otomotif  2. ...         Arial 12pt
 *   Garis    tebal-tipis (thick-thin), total 4,5pt
 *   Logo     kiri ±2,6 × 2,9 cm, kanan ±2,6 × 2,8 cm
 *
 * Satuan "pt" dan "cm" sengaja dipakai (bukan px) supaya
 * hasil cetak / PDF ukurannya sama dengan file Word.
 * ========================================================= */

// Ganti path ini kalau nama file logomu berbeda (taruh di folder public/img/)
export const LOGO_KIRI = "/img/logo_jabar.jpg";
export const LOGO_KANAN = "/img/logo_w.png";

const ARIAL = 'Arial, "Liberation Sans", Helvetica, sans-serif';
const CALIBRI_LIGHT = '"Calibri Light", Calibri, Carlito, Arial, sans-serif';

const s = {
  kop: {
    color: "#000",
    background: "#fff",
    fontFamily: ARIAL,
    lineHeight: 1.15, // = spasi "Single" di Word
    width: "100%",
    maxWidth: "18cm", // lebar isi kertas A4 dengan margin kiri-kanan 1,5 cm
    margin: "0 auto 0.6cm",
  },
  baris: {
    display: "grid",
    gridTemplateColumns: "2.7cm minmax(0, 1fr) 2.7cm",
    alignItems: "start",
    minWidth: "17.5cm", // supaya teks tidak menabrak logo di layar sempit
  },
  logoKiri: { width: "2.62cm", height: "2.93cm", objectFit: "contain" },
  logoKanan: { width: "2.65cm", height: "2.84cm", objectFit: "contain", justifySelf: "end" },
  teks: { textAlign: "center", whiteSpace: "nowrap" },
  yayasan: {
    fontFamily: CALIBRI_LIGHT,
    fontSize: "28pt",
    fontWeight: 700,
    letterSpacing: "-0.5pt",
    lineHeight: 1,
    marginBottom: "4pt",
  },
  smk: { fontSize: "13pt", fontWeight: 700 },
  unggulan: { fontSize: "14pt", fontWeight: 700 },
  alamat: { fontSize: "9pt" },
  kontak: { fontSize: "12pt" },
  email: { color: "#0563C1", textDecoration: "underline" },
  jurusan: { fontSize: "12pt" },
  // Garis ganda: tebal di atas, tipis di bawah
  garis: {
    margin: "0.25cm 0.7cm 0", // garis sedikit lebih pendek dari jarak logo, seperti di Word
    borderTop: "2.5pt solid #000",
    borderBottom: "1pt solid #000",
    height: "1.5pt", // jarak putih antara garis tebal dan tipis
    boxSizing: "content-box", // wajib: Tailwind memakai border-box, jarak putihnya bisa hilang
  },
} satisfies Record<string, CSSProperties>;

export function KopLaporan() {
  return (
    <header style={{ ...s.kop, printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}>
      <div style={s.baris}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_KIRI} alt="Logo kiri" style={s.logoKiri} />

        <div style={s.teks}>
          <p style={s.yayasan}>YAYASAN AS SALAM GEGESIK</p>
          <p style={s.smk}>SEKOLAH MENENGAH KEJURUAN AS SALAM GEGESIK</p>
          <p style={s.unggulan}>SMK PUSAT KEUNGGULAN</p>
          <p style={s.alamat}>
            Alamat : Jalan Raya Gegesik – Telp. (0231) 8830069 -082111760852-Gegesik 45164
          </p>
          <p style={s.kontak}>
            Website: smkassalamgegesik.sch.id Email : <span style={s.email}>smkassalam30@gmail.com</span>
          </p>
          <p style={s.jurusan}>
            1.&nbsp; Teknik Otomotif&nbsp; 2. Teknik Jaringan Komputer dan Telekomunikasi
          </p>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_KANAN} alt="Logo kanan" style={s.logoKanan} />
      </div>

      <div style={s.garis} />
    </header>
  );
}

/* =========================================================
 * TANDA TANGAN — dipakai di bagian akhir setiap laporan
 * Kalau nama tidak diisi, muncul garis titik-titik untuk ditulis tangan.
 * ========================================================= */
export function TandaTangan({
  tanggal = new Date(),
  kepalaSekolah,
  wakaSarpras,
}: {
  tanggal?: Date;
  kepalaSekolah?: string;
  wakaSarpras?: string;
}) {
  const Nama = ({ nama }: { nama?: string }) =>
    nama ? (
      <p style={{ fontWeight: 700, textDecoration: "underline" }}>{nama}</p>
    ) : (
      <p style={{ margin: "0 auto", width: "5cm", borderBottom: "1px dotted #000" }}>&nbsp;</p>
    );

  return (
    <div
      style={{
        marginTop: "1cm",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        textAlign: "center",
        fontFamily: ARIAL,
        fontSize: "11pt",
        lineHeight: 1.4,
        color: "#000",
        breakInside: "avoid",
      }}
    >
      <div>
        <p>&nbsp;</p>
        <p>Mengetahui,</p>
        <p>Kepala Sekolah</p>
        <div style={{ height: "2cm" }} />
        <Nama nama={kepalaSekolah} />
      </div>
      <div>
        <p>Gegesik, {fmtTanggal(tanggal)}</p>
        <p>&nbsp;</p>
        <p>Waka Sarana dan Prasarana</p>
        <div style={{ height: "2cm" }} />
        <Nama nama={wakaSarpras} />
      </div>
    </div>
  );
}

// Supaya bisa di-import dua cara: { KopLaporan } atau default
export default KopLaporan;