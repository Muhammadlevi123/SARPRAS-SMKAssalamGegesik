"use client";

import { useActionState, useId, useState } from "react";
import Modal from "@/components/admin/Modal";
import { toast } from "@/components/admin/Toaster";
import { simpanTahunAjaran } from "@/app/admin/tahun-ajaran/actions";
import type { FormState } from "@/lib/formState";
import { btnIcon, btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/admin/ui";

// Tanggal dalam format input: "2026-07-13"
type TahunAjaran = { id: number; nama: string; mulai: string; selesai: string };

const IkonPensil = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
  </svg>
);

export default function TahunAjaranForm({
  data,
  tampilan = "ikon",
}: {
  data?: TahunAjaran;
  tampilan?: "ikon" | "kartu"; // "kartu" = tombol Edit lebar (untuk HP)
}) {
  const [buka, setBuka] = useState(false);

  let tombol;
  if (!data) {
    tombol = (
      <button type="button" onClick={() => setBuka(true)} className={`${btnPrimary} justify-center`}>
        + Tambah Tahun Ajaran
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
      <button type="button" onClick={() => setBuka(true)} aria-label={`Edit ${data.nama}`} title="Edit" className={btnIcon}>
        <IkonPensil className="size-5" />
      </button>
    );
  }

  return (
    <>
      {tombol}

      {buka && (
        <Modal judul={data ? "Edit Tahun Ajaran" : "Tambah Tahun Ajaran"} onClose={() => setBuka(false)}>
          <IsiForm data={data} onSelesai={() => setBuka(false)} />
        </Modal>
      )}
    </>
  );
}

function IsiForm({ data, onSelesai }: { data?: TahunAjaran; onSelesai: () => void }) {
  // useId: id unik, karena tombol edit ada di kartu HP & tabel desktop
  const uid = useId();
  const [mulai, setMulai] = useState(data?.mulai ?? "");
  const [selesai, setSelesai] = useState(data?.selesai ?? "");

  // Pratinjau nama otomatis, misal "2026/2027"
  const nama = mulai && selesai ? `${mulai.slice(0, 4)}/${selesai.slice(0, 4)}` : "–";

  const [state, formAction, pending] = useActionState(async (prev: FormState, formData: FormData) => {
    const hasil = await simpanTahunAjaran(prev, formData);
    if (hasil.ok) {
      toast(hasil.pesan ?? "Tahun ajaran tersimpan", "sukses");
      onSelesai();
    }
    return hasil;
  }, {});

  return (
    <form action={formAction} className="flex min-w-0 flex-col gap-4">
      {data && <input type="hidden" name="id" value={data.id} />}

      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      {/* HP: berdampingan 2 kolom (tanggal pendek). Tetap 2 kolom di layar lebar */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor={`${uid}-mulai`} className={labelClass}>Tanggal mulai</label>
          <input
            id={`${uid}-mulai`}
            name="mulai"
            type="date"
            required
            value={mulai}
            onChange={(e) => setMulai(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor={`${uid}-selesai`} className={labelClass}>Tanggal selesai</label>
          <input
            id={`${uid}-selesai`}
            name="selesai"
            type="date"
            required
            min={mulai || undefined}
            value={selesai}
            onChange={(e) => setSelesai(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-gray-600">
        Nama tahun ajaran: <b className="text-gray-900">{nama}</b>
        <span className="block text-xs text-gray-400">Dibuat otomatis dari tahun mulai dan tahun selesai.</span>
      </p>

      {/* HP: 2 tombol lebar sama besar. Desktop: di kanan */}
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