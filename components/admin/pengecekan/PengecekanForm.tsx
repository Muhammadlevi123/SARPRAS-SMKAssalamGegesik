"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import Select from "@/components/admin/Select";
import { toast } from "@/components/admin/Toaster";
import { simpanPengecekan } from "@/app/admin/pengecekan/actions";
import type { FormState } from "@/lib/formState";
import { btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/admin/ui";
import { fmtAngka } from "@/lib/format";

export type BarisCek = {
  id: number;
  nama: string;
  merk: string | null;
  kode: string | null;
  satuan: string;
  seharusnya: number;
  baik: number;
  kurang: number;
  rusak: number;
  ket: string;
};

type Nilai = { baik: string; kurang: string; rusak: string; ket: string };
type Filter = "semua" | "masalah" | "aman" | "diubah";

const OPSI_FILTER: { value: Filter; label: string }[] = [
  { value: "semua", label: "Semua barang" },
  { value: "masalah", label: "Bermasalah" },
  { value: "aman", label: "Tanpa masalah" },
  { value: "diubah", label: "Sudah diubah" },
];

const angka = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
};

const inputAngka =
  "h-10 w-full rounded-lg border border-green-100 bg-green-50/60 px-2 text-center text-sm font-semibold outline-none transition focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-500/15";

export default function PengecekanForm({
  lokasiId,
  pengecekanId,
  minTanggal,
  maxTanggal,
  tanggalAwal,
  petugasAwal,
  catatanAwal,
  daftar,
  kembali,
}: {
  lokasiId: number;
  pengecekanId?: number;
  minTanggal: string;
  maxTanggal: string;
  tanggalAwal: string;
  petugasAwal: string;
  catatanAwal: string;
  daftar: BarisCek[];
  kembali: string;
}) {
  const router = useRouter();

  const awal = () =>
    Object.fromEntries(
      daftar.map((b) => [b.id, { baik: String(b.baik), kurang: String(b.kurang), rusak: String(b.rusak), ket: b.ket }])
    ) as Record<number, Nilai>;

  const [tanggal, setTanggal] = useState(tanggalAwal);
  const [petugas, setPetugas] = useState(petugasAwal);
  const [catatan, setCatatan] = useState(catatanAwal);
  const [nilai, setNilai] = useState<Record<number, Nilai>>(awal);
  const [cari, setCari] = useState("");
  const [filter, setFilter] = useState<Filter>("semua");

  const ubah = (id: number, field: keyof Nilai, v: string) =>
    setNilai((n) => ({ ...n, [id]: { ...n[id], [field]: v } }));

  // Hitung kondisi tiap barang
  const hasil = daftar.map((b) => {
    const n = nilai[b.id];
    const baik = angka(n.baik);
    const kurang = angka(n.kurang);
    const rusak = angka(n.rusak);
    const ada = baik + kurang + rusak;
    const hilang = Math.max(0, b.seharusnya - ada);
    const lebih = Math.max(0, ada - b.seharusnya);
    const berubah =
      n.baik !== String(b.baik) || n.kurang !== String(b.kurang) || n.rusak !== String(b.rusak) || n.ket !== b.ket;
    return {
      ...b,
      baik,
      kurang,
      rusak,
      hilang,
      lebih,
      berubah,
      bermasalah: kurang > 0 || rusak > 0 || hilang > 0 || lebih > 0,
    };
  });

  const total = hasil.reduce(
    (t, h) => ({ baik: t.baik + h.baik, kurang: t.kurang + h.kurang, rusak: t.rusak + h.rusak, hilang: t.hilang + h.hilang }),
    { baik: 0, kurang: 0, rusak: 0, hilang: 0 }
  );

  const jumlahPerFilter: Record<Filter, number> = {
    semua: hasil.length,
    masalah: hasil.filter((h) => h.bermasalah).length,
    aman: hasil.filter((h) => !h.bermasalah).length,
    diubah: hasil.filter((h) => h.berubah).length,
  };

  const kata = cari.trim().toLowerCase();
  const tampil = hasil.filter((h) => {
    if (kata && !`${h.nama} ${h.merk ?? ""} ${h.kode ?? ""}`.toLowerCase().includes(kata)) return false;
    if (filter === "masalah") return h.bermasalah;
    if (filter === "aman") return !h.bermasalah;
    if (filter === "diubah") return h.berubah;
    return true;
  });

  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      formData.set(
        "items",
        JSON.stringify(
          daftar.map((b) => ({
            barangId: b.id,
            baik: angka(nilai[b.id].baik),
            kurang: angka(nilai[b.id].kurang),
            rusak: angka(nilai[b.id].rusak),
            ket: nilai[b.id].ket,
          }))
        )
      );
      const hasilSimpan = await simpanPengecekan(prev, formData);
      if (hasilSimpan.ok) {
        toast(hasilSimpan.pesan ?? "Pengecekan tersimpan", "sukses");
        router.push(hasilSimpan.kembali ?? kembali);
      } else if (hasilSimpan.error) {
        toast(hasilSimpan.error, "gagal");
      }
      return hasilSimpan;
    },
    {}
  );

  const opsional = <span className="font-normal text-gray-400">(opsional)</span>;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="lokasiId" value={lokasiId} />
      {pengecekanId && <input type="hidden" name="id" value={pengecekanId} />}

      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      {/* Info pengecekan */}
      <section className="grid gap-4 rounded-3xl border border-green-100 bg-white p-5 shadow-sm md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="tanggal" className={labelClass}>Tanggal</label>
          <input
            id="tanggal"
            name="tanggal"
            type="date"
            required
            min={minTanggal}
            max={maxTanggal}
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="petugas" className={labelClass}>Petugas</label>
          <input
            id="petugas"
            name="petugas"
            required
            value={petugas}
            onChange={(e) => setPetugas(e.target.value)}
            placeholder="Nama petugas yang mengecek"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="catatan" className={labelClass}>Catatan {opsional}</label>
          <input id="catatan" name="catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} className={inputClass} />
        </div>
      </section>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Baik", nilai: total.baik, cls: "bg-green-50 text-green-700" },
          { label: "Kurang Baik", nilai: total.kurang, cls: "bg-amber-50 text-amber-700" },
          { label: "Rusak Berat", nilai: total.rusak, cls: "bg-red-50 text-red-700" },
          { label: "Hilang", nilai: total.hilang, cls: "bg-gray-100 text-gray-700" },
        ].map((k) => (
          <div key={k.label} className={`rounded-2xl px-4 py-3 ${k.cls}`}>
            <p className="text-2xl font-bold">{fmtAngka(k.nilai)}</p>
            <p className="text-xs font-semibold">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Daftar barang */}
      <section className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm">
        {/* Cari & filter */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder={`Cari di ${daftar.length} barang...`}
            aria-label="Cari barang"
            className={`${inputClass} sm:max-w-xs`}
          />
          <Select
            id="filter-kondisi"
            name="x-filter"
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            opsi={OPSI_FILTER.map((o) => ({ value: o.value, label: `${o.label} (${jumlahPerFilter[o.value]})` }))}
            bisaCari={false}
            ariaLabel="Filter barang"
            className="w-full sm:w-56"
          />
        </div>

        {/* Judul kolom (desktop) */}
        <div className="mb-2 hidden gap-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400 md:grid md:grid-cols-[minmax(0,1fr)_5rem_5rem_5rem_minmax(0,14rem)]">
          <span>Barang</span>
          <span className="text-center text-green-700">Baik</span>
          <span className="text-center text-amber-700">Kurang</span>
          <span className="text-center text-red-700">Rusak</span>
          <span>Keterangan</span>
        </div>

        {tampil.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Tidak ada barang untuk filter ini.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tampil.map((h) => (
              <li
                key={h.id}
                className={`grid gap-2 rounded-2xl border p-3 md:grid-cols-[minmax(0,1fr)_5rem_5rem_5rem_minmax(0,14rem)] md:items-center ${
                  h.berubah ? "border-amber-300 bg-amber-50/40" : "border-gray-100"
                }`}
              >
                {/* Nama + status */}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">
                    {h.nama}
                    {h.merk && <span className="font-normal text-gray-500"> · {h.merk}</span>}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                    <span>
                      Seharusnya <b className="text-gray-700">{fmtAngka(h.seharusnya)}</b> {h.satuan}
                    </span>
                    {h.hilang > 0 && <span className="font-semibold text-red-600">Hilang {h.hilang}</span>}
                    {h.lebih > 0 && <span className="font-semibold text-blue-600">Lebih {h.lebih}</span>}
                  </p>
                </div>

                {/* Baik / Kurang / Rusak */}
                <div className="grid grid-cols-3 gap-2 md:contents">
                  {(
                    [
                      ["baik", "Baik", "text-green-700"],
                      ["kurang", "Kurang", "text-amber-700"],
                      ["rusak", "Rusak", "text-red-700"],
                    ] as const
                  ).map(([field, label, warna]) => (
                    <label key={field} className="flex flex-col gap-1">
                      <span className={`text-center text-[11px] font-semibold md:hidden ${warna}`}>{label}</span>
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={nilai[h.id][field]}
                        onChange={(e) => ubah(h.id, field, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        aria-label={`${label} ${h.nama}`}
                        className={inputAngka}
                      />
                    </label>
                  ))}
                </div>

                <input
                  value={nilai[h.id].ket}
                  onChange={(e) => ubah(h.id, "ket", e.target.value)}
                  placeholder="Keterangan"
                  aria-label={`Keterangan ${h.nama}`}
                  className="h-10 w-full rounded-lg border border-gray-100 bg-white px-3 text-sm outline-none focus:border-green-500"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex justify-end gap-3">
        <Link href={kembali} className={btnSecondary}>Batal</Link>
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Menyimpan..." : pengecekanId ? "Simpan Perubahan" : "Simpan Pengecekan"}
        </button>
      </div>
    </form>
  );
}