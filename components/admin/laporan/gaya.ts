// Gaya tabel laporan (ukuran pt/mm supaya di layar & di kertas sama persis)
// [print-color-adjust:exact] = warna latar tetap ikut tercetak

export const tabel = "w-full border-collapse text-[8.5pt] leading-snug text-black";

export const th =
  "border border-gray-400 bg-gray-100 p-[1mm] text-center align-middle text-[7.5pt] font-bold uppercase [print-color-adjust:exact]";

export const td = "border border-gray-300 p-[1mm] align-top";
export const tdTengah = `${td} text-center`;

// Baris judul kelompok (nama lokasi)
export const judulGrup =
  "border border-gray-400 bg-green-50 p-[1mm] text-left font-bold uppercase text-green-900 [print-color-adjust:exact]";

// Sel merah "Belum dicek"
export const tdMerah = `${td} bg-red-50 text-center font-semibold text-red-700 [print-color-adjust:exact]`;

export const barisTotal = "border border-gray-400 bg-gray-100 p-[1mm] font-bold [print-color-adjust:exact]";