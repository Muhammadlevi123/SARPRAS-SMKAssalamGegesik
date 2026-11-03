import { LOGO_KANAN } from "@/components/admin/laporan/KopLaporan";

// Logo SMK As Salam Gegesik (ganti kalau nama file logo sekolahmu berbeda)
export const LOGO_SEKOLAH = LOGO_KANAN;

// Ukuran 1 label (mm): label undangan No. 103 = 64 x 32 mm
export const UKURAN_LABEL = { lebar: 64, tinggi: 32, jarak: 2 };

// Satu label: kode di atas, logo di kiri, QR (dengan logo transparan di tengah) di kanan
export default function LabelQr({ kode, svg, ke, dari }: { kode: string; svg: string; ke: number; dari: number }) {
  return (
    <div
      className="label-qr grid grid-cols-2 grid-rows-[auto_1fr] overflow-hidden border-[0.8mm] border-black bg-white text-black"
      style={{ width: `${UKURAN_LABEL.lebar}mm`, height: `${UKURAN_LABEL.tinggi}mm`, boxSizing: "border-box" }}
    >
      {/* Atas: kode barang selebar label */}
      <p className="col-span-2 border-b-[0.4mm] border-black py-[1mm] text-center font-mono text-[9pt] font-bold leading-none tracking-[0.3mm]">
        {kode}
      </p>

      {/* Kiri: logo sekolah */}
      <div className="grid min-h-0 place-items-center border-r-[0.4mm] border-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_SEKOLAH} alt="Logo SMK As Salam Gegesik" className="size-[20mm] object-contain" />
      </div>

      {/* Kanan: QR */}
      <div className="relative grid min-h-0 place-items-center">
        <div className="relative size-[21mm]">
          <div className="size-full [&>svg]:block [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SEKOLAH} alt="" className="absolute inset-0 m-auto size-[28%] object-contain" />
        </div>

        {/* Nomor unit di pojok kanan bawah */}
        {dari > 1 && (
          <span className="absolute bottom-[0.5mm] right-[0.8mm] text-[5.5pt] leading-none">
            {ke}/{dari}
          </span>
        )}
      </div>
    </div>
  );
}