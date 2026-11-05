"use client";

import { useActionState, useId, useMemo, useState } from "react";
import Modal from "@/components/admin/Modal";
import Combobox from "@/components/admin/Combobox";
import Select from "@/components/admin/Select";
import { toast } from "@/components/admin/Toaster";
import { simpanBarang } from "@/app/admin/barang/actions";
import { formatKode, usulKodeKategori } from "@/lib/kodeBarang";
import type { FormState } from "@/lib/formState";
import { btnIcon, btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/admin/ui";

type Barang = {
  id: number;
  kode: string;
  nama: string;
  merk: string | null;
  kategori: string; // nama kategori
  tahunPerolehan: number;
  satuan: string;
  lokasiId: number;
};
type Opsi = { id: number; nama: string };
type Kategori = { nama: string; kode: string; noTerakhir: number };

type Props = {
  barang?: Barang;
  lokasiList: Opsi[];
  kategoriList: Kategori[];
  satuanList: string[];
  merkList: string[];
};

const IkonPensil = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
  </svg>
);

export default function BarangForm({
  tampilan = "ikon",
  ...props
}: Props & {
  tampilan?: "ikon" | "kartu"; // "kartu" = tombol Edit lebar (untuk HP)
}) {
  const { barang, lokasiList } = props;
  const [buka, setBuka] = useState(false);

  let tombol;
  if (!barang) {
    tombol = (
      <button
        type="button"
        onClick={() => setBuka(true)}
        disabled={lokasiList.length === 0}
        title={lokasiList.length === 0 ? "Tambah lokasi dulu" : undefined}
        className={`${btnPrimary} justify-center`}
      >
        + Tambah Barang
      </button>
    );
  } else if (tampilan === "kartu") {
    tombol = (
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 text-sm font-semibold text-green-700 active:bg-green-100"
      >
        <IkonPensil className="size-5" />
        Edit
      </button>
    );
  } else {
    tombol = (
      <button type="button" onClick={() => setBuka(true)} aria-label={`Edit ${barang.nama}`} title="Edit" className={btnIcon}>
        <IkonPensil className="size-5" />
      </button>
    );
  }

  return (
    <>
      {tombol}

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
  const tahunIni = new Date().getFullYear();

  const [nama, setNama] = useState(barang?.nama ?? "");
  const [merk, setMerk] = useState(barang?.merk ?? "");
  const [kategori, setKategori] = useState(barang?.kategori ?? "");
  const [kodeKategoriKetik, setKodeKategoriKetik] = useState(""); // diisi manual untuk kategori baru
  const [tahun, setTahun] = useState(String(barang?.tahunPerolehan ?? tahunIni));
  const [satuan, setSatuan] = useState(barang?.satuan ?? "");
  const [lokasiId, setLokasiId] = useState(String(barang?.lokasiId ?? ""));

  // ===== Kategori & pratinjau kode barang =====
  const kodeTerpakai = useMemo(() => new Set(kategoriList.map((k) => k.kode)), [kategoriList]);
  const kategoriAda = kategoriList.find((k) => k.nama.toLowerCase() === kategori.trim().toLowerCase());
  const kategoriBaru = kategori.trim() !== "" && !kategoriAda;

  const kodeKategori =
    kategoriAda?.kode ?? (kodeKategoriKetik || (kategoriBaru ? usulKodeKategori(kategori, kodeTerpakai) : ""));
  const nomorTahun = Number(tahun);

  // Edit tanpa mengganti kategori & tahun → kode tetap
  const kodeTetap =
    !!barang &&
    !!kategoriAda &&
    kategoriAda.nama.toLowerCase() === barang.kategori.toLowerCase() &&
    nomorTahun === barang.tahunPerolehan;

  const pratinjau = kodeTetap
    ? barang!.kode
    : kodeKategori && nomorTahun >= 1990
      ? formatKode(kodeKategori, nomorTahun, (kategoriAda?.noTerakhir ?? 0) + 1)
      : "";

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
          autoFocus={!barang}
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Contoh: Jangka Sorong 150x0,05"
          className={inputClass}
        />
      </div>

      {/* Kode (readonly) & Merk */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor={`${uid}-kode`} className={labelClass}>Kode barang</label>
          <input
            id={`${uid}-kode`}
            readOnly
            tabIndex={-1}
            value={pratinjau}
            placeholder="Otomatis dari kategori & tahun"
            className={`${inputClass} cursor-not-allowed bg-gray-50 font-mono text-gray-700`}
          />
          {!kodeTetap && pratinjau && (
            <p className="text-xs text-gray-400">Otomatis. Nomor akhir ditentukan saat disimpan.</p>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2">
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

      {/* Kategori & Tahun perolehan */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor={`${uid}-kategori`} className={labelClass}>Kategori</label>
          <Combobox
            id={`${uid}-kategori`}
            name="kategori"
            value={kategori}
            onChange={(v) => {
              setKategori(v);
              setKodeKategoriKetik(""); // kategori berganti → kode usulan dihitung ulang
            }}
            opsi={kategoriList.map((k) => k.nama)}
            placeholder="Pilih atau ketik baru"
            required
          />
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor={`${uid}-tahun`} className={labelClass}>Tahun perolehan</label>
          <input
            id={`${uid}-tahun`}
            name="tahun"
            type="number"
            inputMode="numeric"
            required
            min={1990}
            max={tahunIni}
            value={tahun}
            onChange={(e) => setTahun(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Kategori baru: kode kategori otomatis, boleh diganti */}
      {kategoriBaru && (
        <div className="flex flex-col gap-2 rounded-2xl border border-green-100 bg-green-50/60 p-3">
          <label htmlFor={`${uid}-kodeKategori`} className={labelClass}>
            Kode kategori baru <span className="font-normal text-gray-400">(3 huruf)</span>
          </label>
          <input
            id={`${uid}-kodeKategori`}
            name="kodeKategori"
            required
            minLength={3}
            maxLength={3}
            autoCapitalize="characters"
            value={kodeKategori}
            onChange={(e) => setKodeKategoriKetik(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
            className={`${inputClass} font-mono uppercase tracking-widest`}
          />
          <p className="text-xs text-gray-500">
            Kategori <b>{kategori.trim()}</b> belum ada dan akan otomatis ditambahkan saat barang disimpan.
          </p>
        </div>
      )}

      {/* Edit: kategori / tahun diganti → kode berubah */}
      {barang && !kodeTetap && kategori.trim() && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Kategori atau tahun diganti, jadi kode barang akan berubah dari <b>{barang.kode}</b>. Label QR lama perlu dicetak ulang.
        </p>
      )}

      {/* Satuan & Lokasi */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
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

        <div className="flex min-w-0 flex-col gap-2">
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
      </div>

      {/* HP: 2 tombol lebar sama besar. Desktop: di kanan seperti semula */}
      <div className="mt-2 grid grid-cols-2 gap-3 sm:flex sm:justify-end">
        <button type="button" onClick={onSelesai} className={`${btnSecondary} justify-center`}>
          Batal
        </button>
        <button type="submit" disabled={pending} className={`${btnPrimary} justify-center`}>
          {pending ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </form>
  );
}