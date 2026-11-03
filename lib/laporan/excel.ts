import "server-only";
import ExcelJS from "exceljs";
import { fmtTanggalPendek } from "@/lib/format";
import { dataBarangMasuk, dataInventaris, dataPengecekan } from "./data";
import type { FilterLaporan } from "./filter";

// ===== Gaya (mengikuti file Excel sekolah) =====
const HIJAU = "FF2E7D32";
const GARIS: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF9CA3AF" } },
  left: { style: "thin", color: { argb: "FF9CA3AF" } },
  bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
  right: { style: "thin", color: { argb: "FF9CA3AF" } },
};
const isi = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

// Pengaturan halaman saat file Excel dicetak: F4 (Folio), TEGAK, lebar dipas 1 halaman.
// 14 = kode kertas Folio/F4 (8,5 x 13 inci) di Excel. Tidak ada di daftar tipe exceljs,
// jadi dipaksa dengan "as ExcelJS.PaperSize" (Excel tetap membacanya dengan benar).
const KERTAS_F4 = 14 as ExcelJS.PaperSize;

const HALAMAN: Partial<ExcelJS.PageSetup> = {
  paperSize: KERTAS_F4,
  orientation: "portrait",
  fitToPage: true,
  fitToWidth: 1,
  fitToHeight: 0,
};

type Kolom = { judul: string; lebar: number; tengah?: boolean };

// Kop sekolah (teks) + judul laporan. Mengembalikan nomor baris berikutnya.
function tulisKop(ws: ExcelJS.Worksheet, jumlahKolom: number, judul: string, subjudul: string[]) {
  const baris = [
    { teks: "YAYASAN AS SALAM GEGESIK", ukuran: 16, tebal: true },
    { teks: "SEKOLAH MENENGAH KEJURUAN AS SALAM GEGESIK", ukuran: 13, tebal: true },
    { teks: "SMK PUSAT KEUNGGULAN", ukuran: 12, tebal: true },
    { teks: "Alamat : Jalan Raya Gegesik – Telp. (0231) 8830069 -082111760852-Gegesik 45164", ukuran: 9 },
    { teks: "Website: smkassalamgegesik.sch.id   Email : smkassalam30@gmail.com", ukuran: 9 },
    { teks: "", ukuran: 6 },
    { teks: `LAPORAN ${judul.toUpperCase()}`, ukuran: 12, tebal: true },
    ...subjudul.map((s) => ({ teks: s, ukuran: 10 })),
  ];

  baris.forEach((b, i) => {
    const r = i + 1;
    ws.mergeCells(r, 1, r, jumlahKolom);
    const sel = ws.getCell(r, 1);
    sel.value = b.teks;
    sel.font = { name: "Arial", size: b.ukuran, bold: !!b.tebal };
    sel.alignment = { horizontal: "center", vertical: "middle" };
  });

  // Garis bawah kop (di baris kosong setelah alamat)
  for (let c = 1; c <= jumlahKolom; c++) ws.getCell(6, c).border = { top: { style: "double" } };

  return baris.length + 2; // satu baris kosong sebelum tabel
}

// Judul kolom 1 baris
function tulisHeader(ws: ExcelJS.Worksheet, r: number, kolom: Kolom[]) {
  kolom.forEach((k, i) => {
    const sel = ws.getCell(r, i + 1);
    sel.value = k.judul;
    gayaHeader(sel);
    ws.getColumn(i + 1).width = k.lebar;
  });
  ws.getRow(r).height = 30;
}

function gayaHeader(sel: ExcelJS.Cell) {
  sel.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  sel.fill = isi(HIJAU);
  sel.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  sel.border = GARIS;
}

// Isi satu baris data (undefined = sel dilewati, misal sel yang sudah digabung)
function tulisBaris(ws: ExcelJS.Worksheet, r: number, kolom: Kolom[], nilai: (string | number | null | undefined)[]) {
  nilai.forEach((v, i) => {
    if (v === undefined) return;
    const sel = ws.getCell(r, i + 1);
    const kosong = v === null || v === "";
    sel.value = kosong ? "–" : v;
    sel.font = { name: "Arial", size: 10 };
    sel.border = GARIS;
    sel.alignment = {
      vertical: "top",
      wrapText: true,
      horizontal: kosong || kolom[i]?.tengah ? "center" : "left",
    };
  });
}

// Baris judul kelompok (nama lokasi), digabung selebar tabel
function tulisGrup(ws: ExcelJS.Worksheet, r: number, jumlahKolom: number, teks: string, merah = false) {
  ws.mergeCells(r, 1, r, jumlahKolom);
  const sel = ws.getCell(r, 1);
  sel.value = teks;
  sel.font = { name: "Arial", size: 10, bold: true, color: { argb: merah ? "FFB91C1C" : "FF14532D" } };
  sel.fill = isi("FFF0FDF4");
  sel.border = GARIS;
}

// Nama sheet: maks 31 karakter, tanpa karakter terlarang, tidak boleh kembar
function namaSheet(wb: ExcelJS.Workbook, nama: string) {
  const dasar = nama.replace(/[\\/?*[\]:]/g, "-").slice(0, 31) || "Sheet";
  let hasil = dasar;
  for (let i = 2; wb.getWorksheet(hasil); i++) hasil = `${dasar.slice(0, 28)} (${i})`;
  return hasil;
}

// ======================= INVENTARIS =======================
// Semua / beberapa lokasi → satu sheet per lokasi (seperti file Excel sekolah)

const KOLOM_INVENTARIS: Kolom[] = [
  { judul: "No.", lebar: 5, tengah: true },
  { judul: "Kode Barang", lebar: 13 },
  { judul: "Nama Barang", lebar: 32 },
  { judul: "Merk", lebar: 14 },
  { judul: "Jumlah", lebar: 9, tengah: true },
  { judul: "Satuan", lebar: 9 },
  { judul: "Tahun Perolehan", lebar: 11, tengah: true },
  { judul: "Sumber Perolehan", lebar: 14 },
  { judul: "Baik", lebar: 8, tengah: true },
  { judul: "Kurang Baik", lebar: 9, tengah: true },
  { judul: "Rusak Berat", lebar: 9, tengah: true },
  { judul: "Keterangan", lebar: 28 },
];

async function excelInventaris(wb: ExcelJS.Workbook, f: FilterLaporan) {
  const data = await dataInventaris(f);
  const n = KOLOM_INVENTARIS.length;

  if (data.length === 0) {
    const ws = wb.addWorksheet("Inventaris", { pageSetup: HALAMAN });
    tulisKop(ws, n, f.judul, [...f.subjudul, "Tidak ada data barang."]);
    return;
  }

  for (const g of data) {
    const ws = wb.addWorksheet(namaSheet(wb, g.nama), { pageSetup: HALAMAN });
    const info = `PJ: ${g.pj ?? "–"} · ${g.tanggalCek ? `kondisi per cek ${fmtTanggalPendek(g.tanggalCek)}` : "belum pernah dicek"}`;
    let r = tulisKop(ws, n, `Inventaris ${g.nama}`, [...f.subjudul.filter((s) => !s.startsWith("Lokasi:")), info]);

    // Header 2 baris: "Kondisi Terakhir" membawahi Baik / Kurang Baik / Rusak Berat
    KOLOM_INVENTARIS.forEach((k, i) => {
      ws.getColumn(i + 1).width = k.lebar;
      if (i >= 8 && i <= 10) return;
      ws.mergeCells(r, i + 1, r + 1, i + 1);
      ws.getCell(r, i + 1).value = k.judul;
      gayaHeader(ws.getCell(r, i + 1));
    });
    ws.mergeCells(r, 9, r, 11);
    ws.getCell(r, 9).value = "Kondisi Terakhir";
    gayaHeader(ws.getCell(r, 9));
    ["Baik", "Kurang Baik", "Rusak Berat"].forEach((j, i) => {
      const sel = ws.getCell(r + 1, 9 + i);
      sel.value = j;
      gayaHeader(sel);
    });
    r += 2;

    g.barang.forEach((b, i) => {
      tulisBaris(ws, r, KOLOM_INVENTARIS, [
        i + 1,
        b.kode,
        b.nama,
        b.merk,
        b.jumlah,
        b.satuan,
        b.tahun,
        b.sumber,
        b.kondisi?.baik ?? null,
        b.kondisi?.kurang ?? null,
        b.kondisi?.rusak ?? null,
        b.keterangan,
      ]);
      if (!b.kondisi) {
        // Belum dicek → 3 sel kondisi digabung, merah
        ws.mergeCells(r, 9, r, 11);
        const sel = ws.getCell(r, 9);
        sel.value = "Belum dicek";
        sel.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFB91C1C" } };
        sel.fill = isi("FFFEF2F2");
        sel.alignment = { horizontal: "center", vertical: "top" };
      }
      r++;
    });
  }
}

// ======================= BARANG MASUK =======================

const KOLOM_BARANG_MASUK: Kolom[] = [
  { judul: "No", lebar: 5, tengah: true },
  { judul: "Tanggal", lebar: 13 },
  { judul: "No. Nota / Dokumen", lebar: 18 },
  { judul: "Barang", lebar: 32 },
  { judul: "Merk", lebar: 14 },
  { judul: "Lokasi", lebar: 18 },
  { judul: "Jumlah", lebar: 8, tengah: true },
  { judul: "Satuan", lebar: 9 },
  { judul: "Sumber", lebar: 13 },
  { judul: "Mitra", lebar: 18 },
  { judul: "Total", lebar: 16, tengah: true },
];

async function excelBarangMasuk(wb: ExcelJS.Workbook, f: FilterLaporan) {
  const data = await dataBarangMasuk(f);
  const ws = wb.addWorksheet("Barang Masuk", { pageSetup: HALAMAN });
  const n = KOLOM_BARANG_MASUK.length;
  let r = tulisKop(ws, n, f.judul, f.subjudul);

  tulisHeader(ws, r, KOLOM_BARANG_MASUK);
  r++;

  data.baris.forEach((b, i) => {
    tulisBaris(ws, r, KOLOM_BARANG_MASUK, [
      i + 1,
      fmtTanggalPendek(b.tanggal),
      b.noNota,
      b.barang,
      b.merk,
      b.lokasi,
      b.jumlah,
      b.satuan,
      b.sumber,
      b.mitra,
      undefined, // kolom Total diisi di bawah (digabung per nota)
    ]);
    if (b.nota) {
      // Total pembayaran: satu sel untuk semua barang di nota yang sama
      if (b.nota.span > 1) ws.mergeCells(r, n, r + b.nota.span - 1, n);
      const sel = ws.getCell(r, n);
      sel.value = b.nota.total ?? "–";
      sel.numFmt = '"Rp"#,##0';
      sel.font = { name: "Arial", size: 10, bold: true };
      sel.alignment = { horizontal: "center", vertical: "middle" };
      for (let i = 0; i < b.nota.span; i++) ws.getCell(r + i, n).border = GARIS;
    }
    r++;
  });

  // Baris total
  ws.mergeCells(r, 1, r, n - 1);
  ws.getCell(r, 1).value = "TOTAL";
  ws.getCell(r, n).value = data.totalNilai;
  ws.getCell(r, n).numFmt = '"Rp"#,##0';
  for (const c of [1, n]) {
    const sel = ws.getCell(r, c);
    sel.font = { name: "Arial", size: 10, bold: true };
    sel.fill = isi("FFF3F4F6");
    sel.border = GARIS;
    sel.alignment = { horizontal: c === 1 ? "right" : "center" };
  }
  r += 3;

  // Rekap per sumber
  ws.getCell(r, 1).value = "Rekap per Sumber";
  ws.getCell(r, 1).font = { name: "Arial", size: 11, bold: true };
  r++;
  const kolomRekap: Kolom[] = [
    { judul: "Sumber", lebar: 5 },
    { judul: "Nota / Dokumen", lebar: 13, tengah: true },
    { judul: "Unit", lebar: 18, tengah: true },
    { judul: "Nilai", lebar: 32, tengah: true },
  ];
  kolomRekap.forEach((k, i) => {
    const sel = ws.getCell(r, i + 1);
    sel.value = k.judul;
    gayaHeader(sel);
  });
  r++;
  for (const x of data.rekap) {
    tulisBaris(ws, r, kolomRekap, [x.sumber, x.nota, x.unit, x.nilai || null]);
    if (x.nilai) ws.getCell(r, 4).numFmt = '"Rp"#,##0';
    r++;
  }
}

// ======================= REKAP PENGECEKAN =======================

const KOLOM_PENGECEKAN: Kolom[] = [
  { judul: "No.", lebar: 5, tengah: true },
  { judul: "Tanggal", lebar: 14 },
  { judul: "Petugas", lebar: 24 },
  { judul: "Total Barang", lebar: 12, tengah: true },
  { judul: "Baik", lebar: 10, tengah: true },
  { judul: "Kurang Baik", lebar: 12, tengah: true },
  { judul: "Rusak Berat", lebar: 12, tengah: true },
  { judul: "Hilang", lebar: 10, tengah: true },
];

async function excelPengecekan(wb: ExcelJS.Workbook, f: FilterLaporan) {
  const data = await dataPengecekan(f);
  const ws = wb.addWorksheet("Rekap Pengecekan", { pageSetup: HALAMAN });
  const n = KOLOM_PENGECEKAN.length;
  const satuLokasi = !f.semuaLokasi && f.lokasi.length === 1;
  let r = tulisKop(ws, n, f.judul, f.subjudul);

  tulisHeader(ws, r, KOLOM_PENGECEKAN);
  r++;

  for (const g of data) {
    if (!satuLokasi) {
      const info = g.cek.length ? `${g.cek.length} pengecekan` : "belum pernah dicek";
      tulisGrup(ws, r, n, `${g.nama.toUpperCase()} · PJ: ${g.pj ?? "–"} · ${info}`, g.cek.length === 0);
      r++;
    }
    if (g.cek.length === 0) {
      ws.mergeCells(r, 1, r, n);
      const sel = ws.getCell(r, 1);
      sel.value = "Belum dicek";
      sel.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFB91C1C" } };
      sel.fill = isi("FFFEF2F2");
      sel.alignment = { horizontal: "center" };
      sel.border = GARIS;
      r++;
      continue;
    }
    g.cek.forEach((c, i) => {
      tulisBaris(ws, r, KOLOM_PENGECEKAN, [i + 1, fmtTanggalPendek(c.tanggal), c.petugas, c.total, c.baik, c.kurang, c.rusak, c.hilang]);
      r++;
    });
  }
}

// ======================= PINTU MASUK =======================

export async function buatExcel(f: FilterLaporan) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SARPRAS SMK As Salam Gegesik";
  wb.created = new Date();

  if (f.jenis === "inventaris") await excelInventaris(wb, f);
  else if (f.jenis === "barang-masuk") await excelBarangMasuk(wb, f);
  else await excelPengecekan(wb, f);

  return new Uint8Array(await wb.xlsx.writeBuffer());
}