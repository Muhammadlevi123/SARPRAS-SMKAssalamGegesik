"use client";

import { useState } from "react";
import Modal from "@/components/admin/Modal";
import Select from "@/components/admin/Select";
import { btnPrimary, btnSecondary, labelClass } from "@/components/admin/ui";
import { useCetakLabel } from "./CetakLabel";

type Opsi = { id: number; nama: string };

// Tombol "Cetak Label" + modal pilih lokasi & kategori
export default function TombolCetakLabel({ lokasiList, kategoriList }: { lokasiList: Opsi[]; kategoriList: Opsi[] }) {
  const [buka, setBuka] = useState(false);
  const [lokasiId, setLokasiId] = useState("");
  const [kategoriId, setKategoriId] = useState("");
  const cetak = useCetakLabel();

  function lanjut() {
    setBuka(false);
    cetak({ lokasiId, kategoriId });
  }

  return (
    <>
      <button type="button" onClick={() => setBuka(true)} className={btnSecondary}>
        Cetak Label
      </button>

      {buka && (
        <Modal judul="Cetak Label QR" onClose={() => setBuka(false)}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="cetak-lokasi" className={labelClass}>Lokasi</label>
              <Select
                id="cetak-lokasi"
                name="cetak-lokasi"
                value={lokasiId}
                onChange={setLokasiId}
                opsi={[{ value: "", label: "Semua lokasi" }, ...lokasiList.map((l) => ({ value: String(l.id), label: l.nama }))]}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="cetak-kategori" className={labelClass}>Kategori</label>
              <Select
                id="cetak-kategori"
                name="cetak-kategori"
                value={kategoriId}
                onChange={setKategoriId}
                opsi={[{ value: "", label: "Semua kategori" }, ...kategoriList.map((k) => ({ value: String(k.id), label: k.nama }))]}
              />
            </div>

            <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-gray-700">
              Satu label untuk <b>setiap unit</b> barang (misal 30 kursi = 30 label). Kertas A4, 24 label per lembar.
            </p>

            <div className="mt-2 flex justify-end gap-3">
              <button type="button" onClick={() => setBuka(false)} className={btnSecondary}>Batal</button>
              <button type="button" onClick={lanjut} className={btnPrimary}>Cetak</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}