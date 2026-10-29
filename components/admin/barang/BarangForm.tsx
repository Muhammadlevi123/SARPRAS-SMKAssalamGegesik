"use client";

import { useActionState, useId, useState } from "react";
import Modal from "@/components/admin/Modal";
import Combobox from "@/components/admin/Combobox";
import Select from "@/components/admin/Select";
import { toast } from "@/components/admin/Toaster";
import { simpanBarang } from "@/app/admin/barang/actions";
import type { FormState } from "@/lib/formState";
import { btnIcon, btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/admin/ui";

type Barang = {
  id: number;
  kode: string | null;
  nama: string;
  merk: string | null;
  kategori: string | null;
  satuan: string;
  lokasiId: number;
};
type Opsi = { id: number; nama: string };

type Props = {
  barang?: Barang;
  lokasiList: Opsi[];
  kategoriList: string[];
  satuanList: string[];
  merkList: string[];
};

export default function BarangForm(props: Props) {
  const { barang, lokasiList } = props;
  const [buka, setBuka] = useState(false);

  return (
    <>
      {barang ? (
        <button type="button" onClick={() => setBuka(true)} aria-label={`Edit ${barang.nama}`} title="Edit" className={btnIcon}>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setBuka(true)}
          disabled={lokasiList.length === 0}
          title={lokasiList.length === 0 ? "Tambah lokasi dulu" : undefined}
          className={btnPrimary}
        >
          + Tambah Barang
        </button>
      )}

      {buka && (
        <Modal judul={barang ? "Edit Barang" : "Tambah Barang"} onClose={() => setBuka(false)}>
          <IsiForm {...props} onSelesai={() => setBuka(false)} />
        </Modal>
      )}
    </>
  );
}

function IsiForm({
  barang,
  lokasiList,
  kategoriList,
  satuanList,
  merkList,
  onSelesai,
}: Props & { onSelesai: () => void }) {
  const uid = useId();
  const [kode, setKode] = useState(barang?.kode ?? "");
  const [nama, setNama] = useState(barang?.nama ?? "");
  const [merk, setMerk] = useState(barang?.merk ?? "");
  const [kategori, setKategori] = useState(barang?.kategori ?? "");
  const [satuan, setSatuan] = useState(barang?.satuan ?? "");
  const [lokasiId, setLokasiId] = useState(String(barang?.lokasiId ?? ""));

  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const hasil = await simpanBarang(prev, formData);
      if (hasil.ok) {
        toast(hasil.pesan ?? "Barang tersimpan", "sukses");
        onSelesai();
      } else if (hasil.error) {
        toast(hasil.error, "gagal");
      }
      return hasil;
    },
    {}
  );

  const opsional = <span className="font-normal text-gray-400">(opsional)</span>;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {barang && <input type="hidden" name="id" value={barang.id} />}

      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      {/* Nama */}
      <div className="flex flex-col gap-2">
        <label htmlFor={`${uid}-nama`} className={labelClass}>Nama barang</label>
        <input
          id={`${uid}-nama`}
          name="nama"
          required
          autoFocus
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Contoh: Jangka Sorong 150x0,05"
          className={inputClass}
        />
      </div>

      {/* Kode & Merk */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${uid}-kode`} className={labelClass}>Kode {opsional}</label>
          <input
            id={`${uid}-kode`}
            name="kode"
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            placeholder="BM-001"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={`${uid}-merk`} className={labelClass}>Merk {opsional}</label>
          <Combobox
            id={`${uid}-merk`}
            name="merk"
            value={merk}
            onChange={setMerk}
            opsi={merkList}
            placeholder="Pilih atau ketik baru"
          />
        </div>
      </div>

      {/* Kategori & Satuan */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${uid}-kategori`} className={labelClass}>Kategori {opsional}</label>
          <Combobox
            id={`${uid}-kategori`}
            name="kategori"
            value={kategori}
            onChange={setKategori}
            opsi={kategoriList}
            placeholder="Pilih atau ketik baru"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={`${uid}-satuan`} className={labelClass}>Satuan</label>
          <Combobox
            id={`${uid}-satuan`}
            name="satuan"
            value={satuan}
            onChange={setSatuan}
            opsi={satuanList}
            placeholder="Pilih atau ketik baru"
            required
          />
        </div>
      </div>

      {/* Lokasi */}
      <div className="flex flex-col gap-2">
        <label htmlFor={`${uid}-lokasi`} className={labelClass}>Lokasi</label>
        <Select
          id={`${uid}-lokasi`}
          name="lokasiId"
          value={lokasiId}
          onChange={setLokasiId}
          opsi={lokasiList.map((l) => ({ value: String(l.id), label: l.nama }))}
          placeholder="Pilih lokasi"
          required
        />
      </div>

      <div className="mt-2 flex justify-end gap-3">
        <button type="button" onClick={onSelesai} className={btnSecondary}>Batal</button>
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </form>
  );
}