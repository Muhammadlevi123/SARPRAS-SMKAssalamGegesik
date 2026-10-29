"use client";

import { useActionState, useState } from "react";
import Modal from "@/components/admin/Modal";
import { toast } from "@/components/admin/Toaster";
import { simpanMitra } from "@/app/admin/mitra/actions";
import type { FormState } from "@/lib/formState";
import { btnIcon, btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/admin/ui";

type Mitra = { id: number; nama: string; kontak: string | null };

export default function MitraForm({ mitra }: { mitra?: Mitra }) {
  const [buka, setBuka] = useState(false);

  return (
    <>
      {mitra ? (
        <button type="button" onClick={() => setBuka(true)} aria-label={`Edit ${mitra.nama}`} title="Edit" className={btnIcon}>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
          </svg>
        </button>
      ) : (
        <button type="button" onClick={() => setBuka(true)} className={btnPrimary}>
          + Tambah Mitra
        </button>
      )}

      {buka && (
        <Modal judul={mitra ? "Edit Mitra" : "Tambah Mitra"} onClose={() => setBuka(false)}>
          <IsiForm mitra={mitra} onSelesai={() => setBuka(false)} />
        </Modal>
      )}
    </>
  );
}

function IsiForm({ mitra, onSelesai }: { mitra?: Mitra; onSelesai: () => void }) {
  const [nama, setNama] = useState(mitra?.nama ?? "");
  const [kontak, setKontak] = useState(mitra?.kontak ?? "");

  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const hasil = await simpanMitra(prev, formData);
      if (hasil.ok) {
        toast(hasil.pesan ?? "Mitra tersimpan", "sukses");
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
      {mitra && <input type="hidden" name="id" value={mitra.id} />}

      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="nama" className={labelClass}>Nama mitra</label>
        <input
          id="nama"
          name="nama"
          required
          autoFocus
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Contoh: PT Astra Honda Motor"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="kontak" className={labelClass}>
          Kontak <span className="font-normal text-gray-400">(opsional)</span>
        </label>
        <input
          id="kontak"
          name="kontak"
          value={kontak}
          onChange={(e) => setKontak(e.target.value)}
          placeholder="Nama PIC / No. HP / Email"
          className={inputClass}
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