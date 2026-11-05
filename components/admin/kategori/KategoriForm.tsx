"use client";

import { useActionState, useId, useState } from "react";
import Modal from "@/components/admin/Modal";
import { toast } from "@/components/admin/Toaster";
import { ubahKategori } from "@/app/admin/kategori/actions";
import type { FormState } from "@/lib/formState";
import { btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/admin/ui";

type Data = { id: number; nama: string; kode: string; jumlahBarang: number };

const IkonPensil = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);

// Tombol untuk mengubah nama & kode kategori
export default function KategoriForm({
  data,
  tampilan = "ikon",
}: {
  data: Data;
  tampilan?: "ikon" | "kartu"; // "kartu" = tombol lebar (untuk HP)
}) {
  const [buka, setBuka] = useState(false);

  return (
    <>
      {tampilan === "kartu" ? (
        <button
          type="button"
          onClick={() => setBuka(true)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 text-sm font-semibold text-green-700 active:bg-green-100"
        >
          <IkonPensil className="size-5" />
          Ubah Kategori
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setBuka(true)}
          title="Ubah kategori"
          aria-label="Ubah kategori"
          className="rounded-lg p-2 text-gray-500 hover:bg-green-50 hover:text-green-700"
        >
          <IkonPensil className="size-5" />
        </button>
      )}

      {buka && (
        <Modal judul="Ubah Kategori" onClose={() => setBuka(false)}>
          <IsiForm data={data} onSelesai={() => setBuka(false)} />
        </Modal>
      )}
    </>
  );
}

function IsiForm({ data, onSelesai }: { data: Data; onSelesai: () => void }) {
  // useId: id unik, karena tombol ubah ada di kartu HP & tabel desktop
  const uid = useId();
  const [nama, setNama] = useState(data.nama);
  const [kode, setKode] = useState(data.kode);
  const kodeBerubah = kode !== data.kode;

  const [state, formAction, pending] = useActionState(async (prev: FormState, formData: FormData) => {
    const hasil = await ubahKategori(prev, formData);
    if (hasil.ok) {
      toast(hasil.pesan ?? "Kategori diperbarui", "sukses");
      onSelesai();
    }
    return hasil;
  }, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={data.id} />

      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor={`${uid}-nama`} className={labelClass}>Nama Kategori</label>
        <input
          id={`${uid}-nama`}
          name="nama"
          required
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${uid}-kode`} className={labelClass}>Kode (3 huruf)</label>
        <input
          id={`${uid}-kode`}
          name="kode"
          required
          minLength={3}
          maxLength={3}
          autoCapitalize="characters"
          value={kode}
          onChange={(e) => setKode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
          className={`${inputClass} font-mono uppercase tracking-widest`}
        />
        <p className="text-xs text-gray-400">Contoh kode barang: ASG-{kode || "XXX"}-26-0001</p>
      </div>

      {/* Peringatan: kode barang yang sudah ada ikut berubah */}
      {kodeBerubah && data.jumlahBarang > 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <b>{data.jumlahBarang} kode barang</b> di kategori ini akan ikut berubah dari <b>ASG-{data.kode}-…</b> menjadi{" "}
          <b>ASG-{kode || "XXX"}-…</b>. Label QR yang sudah tertempel perlu dicetak ulang.
        </p>
      )}

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