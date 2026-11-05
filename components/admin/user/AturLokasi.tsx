"use client";

import { useActionState, useId, useState } from "react";
import Modal from "@/components/admin/Modal";
import Select from "@/components/admin/Select";
import { toast } from "@/components/admin/Toaster";
import { aturLokasi } from "@/app/admin/user/actions";
import type { FormState } from "@/lib/formState";
import { btnPrimary, btnSecondary, labelClass } from "@/components/admin/ui";

type Lokasi = { id: number; nama: string };

const tombolKecil = "rounded-lg px-3 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-50";

const IkonLokasi = () => (
  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z" />
    <path d="M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
  </svg>
);

// Tombol "Atur Lokasi" di setiap USER
export default function AturLokasi({
  id,
  nama,
  lokasiId,
  lokasi,
  tampilan = "teks",
}: {
  id: number;
  nama: string;
  lokasiId: number | null;
  lokasi: Lokasi[];
  tampilan?: "teks" | "kartu"; // "kartu" = tombol lebar (untuk HP)
}) {
  const [buka, setBuka] = useState(false);
  const label = lokasiId ? "Ubah Lokasi" : "Atur Lokasi";

  return (
    <>
      {tampilan === "kartu" ? (
        // Belum ada lokasi → kuning (perlu diurus). Sudah ada → hijau
        <button
          type="button"
          onClick={() => setBuka(true)}
          className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${
            lokasiId
              ? "border-green-200 bg-green-50 text-green-700 active:bg-green-100"
              : "border-amber-300 bg-amber-100 text-amber-800 active:bg-amber-200"
          }`}
        >
          <IkonLokasi />
          {label}
        </button>
      ) : (
        <button type="button" onClick={() => setBuka(true)} className={tombolKecil}>
          {label}
        </button>
      )}

      {buka && (
        <Modal judul="Atur Lokasi" onClose={() => setBuka(false)}>
          <IsiForm id={id} nama={nama} lokasiId={lokasiId} lokasi={lokasi} onSelesai={() => setBuka(false)} />
        </Modal>
      )}
    </>
  );
}

function IsiForm({
  id,
  nama,
  lokasiId,
  lokasi,
  onSelesai,
}: {
  id: number;
  nama: string;
  lokasiId: number | null;
  lokasi: Lokasi[];
  onSelesai: () => void;
}) {
  // useId: id unik, karena tombol ada di kartu HP & tabel desktop
  const uid = useId();
  const [pilihan, setPilihan] = useState(lokasiId ? String(lokasiId) : "");

  const [state, formAction, pending] = useActionState(async (prev: FormState, formData: FormData) => {
    const hasil = await aturLokasi(prev, formData);
    if (hasil.ok) {
      toast(hasil.pesan ?? "Lokasi disimpan", "sukses");
      onSelesai();
    }
    return hasil;
  }, {});

  return (
    <form action={formAction} className="flex min-w-0 flex-col gap-4">
      <input type="hidden" name="id" value={id} />

      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      <p className="break-words text-sm text-gray-600">
        Pilih lokasi tanggung jawab <b className="text-gray-900">{nama}</b>. Akun ini hanya bisa dipakai setelah
        lokasinya ditetapkan.
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${uid}-lokasi`} className={labelClass}>Lokasi</label>
        <Select
          id={`${uid}-lokasi`}
          name="lokasiId"
          value={pilihan}
          onChange={setPilihan}
          opsi={[
            { value: "", label: "— Belum ditetapkan —" },
            ...lokasi.map((l) => ({ value: String(l.id), label: l.nama })),
          ]}
        />
        {lokasiId && !pilihan && (
          <p className="text-xs text-amber-700">Lokasi akan dilepas. Akun ini kembali menunggu dan tidak bisa dipakai.</p>
        )}
      </div>

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