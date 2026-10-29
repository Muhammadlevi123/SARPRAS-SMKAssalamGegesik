"use client";

import { useActionState, useState } from "react";
import Modal from "@/components/admin/Modal";
import { simpanTahunAjaran } from "@/app/admin/pengaturan/actions";
import type { FormState } from "@/lib/formState";
import { btnIcon, btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/admin/ui";

type TahunAjaran = { id: number; nama: string; mulai: string }; // mulai: "2026-07-13"

export default function TahunAjaranForm({ data }: { data?: TahunAjaran }) {
  const [buka, setBuka] = useState(false);

  return (
    <>
      {data ? (
        <button type="button" onClick={() => setBuka(true)} aria-label={`Edit ${data.nama}`} title="Edit" className={btnIcon}>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
          </svg>
        </button>
      ) : (
        <button type="button" onClick={() => setBuka(true)} className={btnPrimary}>
          + Tambah Tahun Ajaran
        </button>
      )}

      {buka && (
        <Modal judul={data ? "Edit Tahun Ajaran" : "Tambah Tahun Ajaran"} onClose={() => setBuka(false)}>
          <IsiForm data={data} onSelesai={() => setBuka(false)} />
        </Modal>
      )}
    </>
  );
}

function IsiForm({ data, onSelesai }: { data?: TahunAjaran; onSelesai: () => void }) {
  const [nama, setNama] = useState(data?.nama ?? "");
  const [mulai, setMulai] = useState(data?.mulai ?? "");

  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const hasil = await simpanTahunAjaran(prev, formData);
      if (hasil.ok) onSelesai();
      return hasil;
    },
    {}
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {data && <input type="hidden" name="id" value={data.id} />}

      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="nama" className={labelClass}>Tahun ajaran</label>
        <input
          id="nama"
          name="nama"
          required
          autoFocus
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="2026/2027"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="mulai" className={labelClass}>Tanggal mulai</label>
        <input
          id="mulai"
          name="mulai"
          type="date"
          required
          value={mulai}
          onChange={(e) => setMulai(e.target.value)}
          className={inputClass}
        />
        <p className="text-xs text-gray-400">
          Berakhir otomatis sehari sebelum tahun ajaran berikutnya dimulai.
        </p>
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