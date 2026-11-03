"use client";

import { useState } from "react";
import Modal from "@/components/admin/Modal";
import { btnIcon, btnPrimary, btnSecondary } from "@/components/admin/ui";
import LabelQr from "./LabelQr";
import { useCetakLabel } from "./CetakLabel";

// Ikon QR di setiap baris barang → modal pratinjau label + tombol cetak
export default function LihatQr({
  id,
  kode,
  nama,
  lokasi,
  jumlah,
  satuan,
  svg,
}: {
  id: number;
  kode: string;
  nama: string;
  lokasi: string;
  jumlah: number;
  satuan: string;
  svg: string;
}) {
  const [buka, setBuka] = useState(false);
  const cetak = useCetakLabel();
  const banyakLabel = Math.max(1, jumlah);

  return (
    <>
      <button type="button" onClick={() => setBuka(true)} aria-label={`Label QR ${nama}`} title="Label QR" className={btnIcon}>
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h6v6H4z" />
          <path d="M14 4h6v6h-6z" />
          <path d="M4 14h6v6H4z" />
          <path d="M14 14h2v2h-2z" />
          <path d="M18 18h2v2h-2z" />
          <path d="M18 14h2" />
          <path d="M14 18v2" />
        </svg>
      </button>

      {buka && (
        <Modal judul="Label QR" onClose={() => setBuka(false)}>
          <div className="flex flex-col gap-5">
            {/* Pratinjau label (diperbesar 1,5x supaya jelas di layar) */}
            <div className="grid place-items-center rounded-2xl bg-gray-50 p-4">
              <div style={{ zoom: 1.5 }}>
                <LabelQr kode={kode} svg={svg} ke={1} dari={banyakLabel} />
              </div>
            </div>

            <dl className="grid grid-cols-[90px_1fr] gap-y-1.5 text-sm">
              <dt className="text-gray-500">Barang</dt>
              <dd className="font-semibold text-gray-900">{nama}</dd>
              <dt className="text-gray-500">Lokasi</dt>
              <dd className="text-gray-800">{lokasi}</dd>
              <dt className="text-gray-500">Jumlah</dt>
              <dd className="text-gray-800">
                {jumlah.toLocaleString("id-ID")} {satuan} → <b>{banyakLabel} label</b>
              </dd>
            </dl>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button type="button" onClick={() => setBuka(false)} className={btnSecondary}>Tutup</button>
              <button
                type="button"
                onClick={() => {
                  setBuka(false);
                  cetak({ id });
                }}
                className={btnPrimary}
              >
                Cetak {banyakLabel} label
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}