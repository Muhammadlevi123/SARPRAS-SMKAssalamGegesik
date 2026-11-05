"use client";

import { useActionState, useId, useState } from "react";
import Modal from "@/components/admin/Modal";
import { toast } from "@/components/admin/Toaster";
import { simpanLokasi } from "@/app/admin/lokasi/actions";
import type { FormState } from "@/lib/formState";
import { btnIcon, btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/admin/ui";

type Lokasi = { id: number; nama: string; penanggungJawab: string | null };

const IkonPensil = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
  </svg>
);

export default function LokasiForm({
  lokasi,
  tampilan = "ikon",
}: {
  lokasi?: Lokasi;
  tampilan?: "ikon" | "kartu"; // "kartu" = tombol Edit lebar (untuk HP)
}) {
  const [buka, setBuka] = useState(false);

  let tombol;
  if (!lokasi) {
    tombol = (
      <button type="button" onClick={() => setBuka(true)} className={btnPrimary}>
        + Tambah Lokasi
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
      <button type="button" onClick={() => setBuka(true)} aria-label={`Edit ${lokasi.nama}`} title="Edit" className={btnIcon}>
        <IkonPensil className="size-5" />
      </button>
    );
  }

  return (
    <>
      {tombol}

      {buka && (
        <Modal judul={lokasi ? "Edit Lokasi" : "Tambah Lokasi"} onClose={() => setBuka(false)}>
          <IsiForm lokasi={lokasi} onSelesai={() => setBuka(false)} />
        </Modal>
      )}
    </>
  );
}

function IsiForm({ lokasi, onSelesai }: { lokasi?: Lokasi; onSelesai: () => void }) {
  // useId: id unik, karena tombol edit ada di kartu HP & tabel desktop
  const uid = useId();
  const [nama, setNama] = useState(lokasi?.nama ?? "");
  const [pj, setPj] = useState(lokasi?.penanggungJawab ?? "");

  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const hasil = await simpanLokasi(prev, formData);
      if (hasil.ok) {
        toast(hasil.pesan ?? "Lokasi tersimpan", "sukses");
        onSelesai();
      } else if (hasil.error) {
        toast(hasil.error, "gagal");
      }
      return hasil;
    },
    {}
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {lokasi && <input type="hidden" name="id" value={lokasi.id} />}

      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor={`${uid}-nama`} className={labelClass}>Nama lokasi</label>
        <input
          id={`${uid}-nama`}
          name="nama"
          required
          autoFocus
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Contoh: Bengkel Motor"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${uid}-pj`} className={labelClass}>
          Penanggung jawab <span className="font-normal text-gray-400">(opsional)</span>
        </label>
        <input
          id={`${uid}-pj`}
          name="penanggungJawab"
          value={pj}
          onChange={(e) => setPj(e.target.value)}
          placeholder="Contoh: Suhardi"
          className={inputClass}
        />
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