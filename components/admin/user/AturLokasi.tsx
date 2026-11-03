"use client";

import { useActionState, useState } from "react";
import Modal from "@/components/admin/Modal";
import Select from "@/components/admin/Select";
import { toast } from "@/components/admin/Toaster";
import { aturLokasi } from "@/app/admin/user/actions";
import type { FormState } from "@/lib/formState";
import { btnPrimary, btnSecondary, labelClass } from "@/components/admin/ui";

type Lokasi = { id: number; nama: string };

const tombolKecil = "rounded-lg px-3 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-50";

// Tombol "Atur Lokasi" di setiap baris USER
export default function AturLokasi({
  id,
  nama,
  lokasiId,
  lokasi,
}: {
  id: number;
  nama: string;
  lokasiId: number | null;
  lokasi: Lokasi[];
}) {
  const [buka, setBuka] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setBuka(true)} className={tombolKecil}>
        {lokasiId ? "Ubah Lokasi" : "Atur Lokasi"}
      </button>

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
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />

      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      <p className="text-sm text-gray-600">
        Pilih lokasi tanggung jawab <b className="text-gray-900">{nama}</b>. Akun ini hanya bisa dipakai setelah
        lokasinya ditetapkan.
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor="lokasiId" className={labelClass}>Lokasi</label>
        <Select
          id="lokasiId"
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

      <div className="mt-2 flex justify-end gap-3">
        <button type="button" onClick={onSelesai} className={btnSecondary}>Batal</button>
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </form>
  );
}