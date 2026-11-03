"use client";

import { useActionState, useState } from "react";
import Modal from "@/components/admin/Modal";
import { toast } from "@/components/admin/Toaster";
import { tambahPengajuan } from "@/app/admin/pengajuan/actions";
import type { FormState } from "@/lib/formState";
import { btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/admin/ui";

type Baris = { kunci: number; nama: string; merk: string; jumlah: string; satuan: string };

const SATUAN = ["Pcs", "Set", "Unit", "Buah"];

let urut = 0;
const barisBaru = (): Baris => ({ kunci: ++urut, nama: "", merk: "", jumlah: "1", satuan: "Pcs" });

// Khusus USER: pengajuan untuk lokasinya sendiri
export default function PengajuanForm({ namaLokasi }: { namaLokasi: string }) {
  const [buka, setBuka] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setBuka(true)} className={btnPrimary}>
        + Buat Pengajuan
      </button>

      {buka && (
        <Modal judul="Buat Pengajuan" onClose={() => setBuka(false)}>
          <IsiForm namaLokasi={namaLokasi} onSelesai={() => setBuka(false)} />
        </Modal>
      )}
    </>
  );
}

function IsiForm({ namaLokasi, onSelesai }: { namaLokasi: string; onSelesai: () => void }) {
  // Isian dikontrol supaya tidak hilang kalau ada error
  const [baris, setBaris] = useState<Baris[]>(() => [barisBaru()]);
  const [alasan, setAlasan] = useState("");

  const [state, formAction, pending] = useActionState(async (prev: FormState, formData: FormData) => {
    const hasil = await tambahPengajuan(prev, formData);
    if (hasil.ok) {
      toast(hasil.pesan ?? "Pengajuan terkirim", "sukses");
      onSelesai();
    }
    return hasil;
  }, {});

  function ubah(kunci: number, kolom: keyof Omit<Baris, "kunci">, nilai: string) {
    setBaris((lama) => lama.map((b) => (b.kunci === kunci ? { ...b, [kolom]: nilai } : b)));
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-gray-700">
        Untuk lokasi <b className="text-gray-900">{namaLokasi}</b>
      </p>

      {/* Barang yang diajukan */}
      <div className="flex flex-col gap-2">
        <span className={labelClass}>Barang yang diajukan</span>

        <datalist id="daftar-satuan">
          {SATUAN.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>

        <div className="flex flex-col gap-3">
          {baris.map((b, i) => (
            <div key={b.kunci} className="rounded-2xl border border-gray-100 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Barang {i + 1}</span>
                {baris.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setBaris((lama) => lama.filter((x) => x.kunci !== b.kunci))}
                    className="rounded-md px-2 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Hapus
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1.3fr_80px_100px]">
                <input
                  name="nama"
                  placeholder="Nama barang"
                  value={b.nama}
                  onChange={(e) => ubah(b.kunci, "nama", e.target.value)}
                  className={`${inputClass} col-span-2 sm:col-span-1`}
                />
                <input
                  name="merk"
                  placeholder="Merk (opsional)"
                  value={b.merk}
                  onChange={(e) => ubah(b.kunci, "merk", e.target.value)}
                  className={`${inputClass} col-span-2 sm:col-span-1`}
                />
                <input
                  name="jumlah"
                  type="number"
                  min={1}
                  placeholder="Jumlah"
                  value={b.jumlah}
                  onChange={(e) => ubah(b.kunci, "jumlah", e.target.value)}
                  className={inputClass}
                />
                <input
                  name="satuan"
                  list="daftar-satuan"
                  placeholder="Satuan"
                  value={b.satuan}
                  onChange={(e) => ubah(b.kunci, "satuan", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setBaris((lama) => [...lama, barisBaru()])}
          className="self-start rounded-lg px-3 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-50"
        >
          + Tambah barang
        </button>
      </div>

      {/* Alasan */}
      <div className="flex flex-col gap-2">
        <label htmlFor="alasan" className={labelClass}>Alasan</label>
        <textarea
          id="alasan"
          name="alasan"
          rows={4}
          required
          maxLength={2000}
          placeholder="Contoh: Kunci torsi di bengkel rusak berat saat pengecekan Oktober, dibutuhkan untuk praktik kelas XI."
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
        <button type="button" onClick={onSelesai} className={btnSecondary}>Batal</button>
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Mengirim..." : "Kirim Pengajuan"}
        </button>
      </div>
    </form>
  );
}