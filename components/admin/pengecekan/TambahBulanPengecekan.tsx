"use client";

import { useActionState, useState } from "react";
import Modal from "@/components/admin/Modal";
import Select from "@/components/admin/Select";
import { toast } from "@/components/admin/Toaster";
import { tambahPeriode } from "@/app/admin/pengecekan/actions";
import type { FormState } from "@/lib/formState";
import { btnPrimary, btnSecondary, labelClass } from "@/components/admin/ui";

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// Tombol + pop-up untuk menambah bulan pengecekan
export default function TambahBulanPengecekan({ tahunIni, bulanIni }: { tahunIni: number; bulanIni: number }) {
  const [buka, setBuka] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setBuka(true)} className={btnPrimary}>
        + Tambah Pengecekan
      </button>

      {buka && (
        <Modal judul="Tambah Pengecekan" onClose={() => setBuka(false)}>
          <IsiForm tahunIni={tahunIni} bulanIni={bulanIni} onSelesai={() => setBuka(false)} />
        </Modal>
      )}
    </>
  );
}

function IsiForm({
  tahunIni,
  bulanIni,
  onSelesai,
}: {
  tahunIni: number;
  bulanIni: number;
  onSelesai: () => void;
}) {
  const [bulan, setBulan] = useState(String(bulanIni));
  const [tahun, setTahun] = useState(String(tahunIni));

  // Tahun depan sampai 5 tahun ke belakang
  const daftarTahun = Array.from({ length: 7 }, (_, i) => tahunIni + 1 - i);

  const [, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const hasil = await tambahPeriode(prev, formData);
      if (hasil.ok) {
        toast(hasil.pesan ?? "Pengecekan ditambahkan", "sukses");
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
      <p className="text-sm text-gray-500">
        Pilih bulan dan tahun pengecekan. Setelah ditambahkan, klik <b>Detail</b> untuk mulai mengecek per lokasi.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="pilih-bulan" className={labelClass}>Bulan</label>
          <Select
            id="pilih-bulan"
            name="bulan"
            value={bulan}
            onChange={setBulan}
            opsi={NAMA_BULAN.map((n, i) => ({ value: String(i + 1), label: n }))}
            bisaCari={false}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="pilih-tahun" className={labelClass}>Tahun</label>
          <Select
            id="pilih-tahun"
            name="tahun"
            value={tahun}
            onChange={setTahun}
            opsi={daftarTahun.map((t) => ({ value: String(t), label: String(t) }))}
            bisaCari={false}
          />
        </div>
      </div>

      <div className="mt-2 flex justify-end gap-3">
        <button type="button" onClick={onSelesai} className={btnSecondary}>Batal</button>
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Menyimpan..." : "Tambah"}
        </button>
      </div>
    </form>
  );
}