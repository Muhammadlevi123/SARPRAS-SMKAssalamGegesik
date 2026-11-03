"use client";

import { useActionState, useState } from "react";
import Modal from "@/components/admin/Modal";
import Select, { type OpsiSelect } from "@/components/admin/Select";
import { toast } from "@/components/admin/Toaster";
import { tambahPeriode } from "@/app/admin/pengecekan/actions";
import type { FormState } from "@/lib/formState";
import { btnPrimary, btnSecondary, labelClass } from "@/components/admin/ui";

// Tombol + pop-up untuk menambah bulan pengecekan di tahun ajaran terpilih
export default function TambahBulanPengecekan({
  namaTA,
  opsi,
  bulanAwal,
}: {
  namaTA: string;
  opsi: OpsiSelect[]; // bulan di tahun ajaran ini yang belum ditambahkan, value: "2026-10"
  bulanAwal: string;
}) {
  const [buka, setBuka] = useState(false);
  const habis = opsi.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setBuka(true)}
        disabled={habis}
        title={habis ? `Semua bulan di tahun ajaran ${namaTA} sudah ditambahkan` : undefined}
        className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        + Tambah Pengecekan
      </button>

      {buka && (
        <Modal judul="Tambah Pengecekan" onClose={() => setBuka(false)}>
          <IsiForm namaTA={namaTA} opsi={opsi} bulanAwal={bulanAwal} onSelesai={() => setBuka(false)} />
        </Modal>
      )}
    </>
  );
}

function IsiForm({
  namaTA,
  opsi,
  bulanAwal,
  onSelesai,
}: {
  namaTA: string;
  opsi: OpsiSelect[];
  bulanAwal: string;
  onSelesai: () => void;
}) {
  const [bulan, setBulan] = useState(bulanAwal);

  const [, formAction, pending] = useActionState(async (prev: FormState, formData: FormData) => {
    const hasil = await tambahPeriode(prev, formData);
    if (hasil.ok) {
      toast(hasil.pesan ?? "Pengecekan ditambahkan", "sukses");
      onSelesai();
    } else if (hasil.error) {
      toast(hasil.error, "gagal");
    }
    return hasil;
  }, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-gray-500">
        Pilih bulan di <b>Tahun Ajaran {namaTA}</b>. Setelah ditambahkan, klik <b>Detail</b> untuk mulai mengecek per
        lokasi.
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor="pilih-bulan" className={labelClass}>Bulan</label>
        <Select id="pilih-bulan" name="bulan" value={bulan} onChange={setBulan} opsi={opsi} bisaCari={false} />
      </div>

      <div className="mt-2 flex justify-end gap-3">
        <button type="button" onClick={onSelesai} className={btnSecondary}>Batal</button>
        <button type="submit" disabled={pending || !bulan} className={btnPrimary}>
          {pending ? "Menyimpan..." : "Tambah"}
        </button>
      </div>
    </form>
  );
}