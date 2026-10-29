import Image from "next/image";
import { fmtTanggal } from "@/lib/format";

export function KopLaporan({ judul, periode, lokasi }: { judul: string; periode: string; lokasi?: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-4 border-b-4 border-double border-gray-800 pb-3">
        {/* logo berwarna; pakai logo_w.png jika hanya itu yang ada */}
        <Image src="/img/logo_w.png" alt="Logo" width={64} height={64} className="size-16 rounded-full bg-green-800 object-contain p-1" />
        <div className="flex-1 text-center">
          <p className="text-lg font-bold uppercase tracking-wide">SMK Assalam Gegesik</p>
          <p className="text-sm text-gray-600">Sarana dan Prasarana</p>
        </div>
        <div className="size-16" />
      </div>
      <div className="mt-4 text-center">
        <h3 className="text-base font-bold uppercase">{judul}</h3>
        <p className="text-sm text-gray-600">
          {periode}
          {lokasi ? ` · ${lokasi}` : ""}
        </p>
      </div>
    </div>
  );
}

export function TandaTangan() {
  return (
    <div className="mt-10 grid grid-cols-2 gap-8 text-center text-sm print:break-inside-avoid">
      <div>
        <p>Mengetahui,</p>
        <p>Kepala Sekolah</p>
        <div className="h-20" />
        <p>(.................................................)</p>
      </div>
      <div>
        <p>Gegesik, {fmtTanggal(new Date())}</p>
        <p>Waka Sarana dan Prasarana</p>
        <div className="h-20" />
        <p>(.................................................)</p>
      </div>
    </div>
  );
}