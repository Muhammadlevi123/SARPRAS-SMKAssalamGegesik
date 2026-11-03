"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/admin/Modal";
import Select from "@/components/admin/Select";
import { toast } from "@/components/admin/Toaster";
import { btnPrimary, btnSecondary, labelClass } from "@/components/admin/ui";

type OpsiTA = { id: number; nama: string; aktif: boolean; bulan: { kode: string; label: string }[] };
type Lokasi = { id: number; nama: string };
type Jenis = "inventaris" | "barang-masuk" | "pengecekan";
type Hasil = "excel" | "cetak";

const KARTU: { jenis: Jenis; judul: string; ket: string }[] = [
  {
    jenis: "inventaris",
    judul: "Inventaris per Lokasi",
    ket: "Daftar barang tiap lokasi beserta kondisi terakhirnya.",
  },
  {
    jenis: "barang-masuk",
    judul: "Barang Masuk",
    ket: "Nota / dokumen barang masuk dan total pembayarannya.",
  },
  {
    jenis: "pengecekan",
    judul: "Rekap Pengecekan",
    ket: "Riwayat pengecekan per lokasi: kapan, siapa, dan hasilnya.",
  },
];

// Pilihan hasil, urut: Excel → Cetak / PDF
const PILIHAN_HASIL: { nilai: Hasil; label: string; ket: string }[] = [
  { nilai: "excel", label: "Excel", ket: "Download file .xlsx" },
  { nilai: "cetak", label: "Cetak / PDF", ket: "Langsung ke jendela print browser" },
];

const jeda = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function PilihLaporan({ tahunAjaran, taAwal, lokasi }: { tahunAjaran: OpsiTA[]; taAwal: number; lokasi: Lokasi[] }) {
  const [jenis, setJenis] = useState<Jenis | null>(null);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {KARTU.map((k) => (
          <div key={k.jenis} className="flex flex-col gap-3 rounded-3xl border border-green-100 bg-white p-5 shadow-sm">
            <div>
              <h3 className="font-semibold text-gray-900">{k.judul}</h3>
              <p className="mt-1 text-sm text-gray-500">{k.ket}</p>
            </div>
            <button type="button" onClick={() => setJenis(k.jenis)} className={`${btnPrimary} mt-auto`}>
              Export
            </button>
          </div>
        ))}
      </div>

      {jenis && (
        <Modal judul={`Laporan ${KARTU.find((k) => k.jenis === jenis)!.judul}`} onClose={() => setJenis(null)}>
          <FormExport jenis={jenis} tahunAjaran={tahunAjaran} taAwal={taAwal} lokasi={lokasi} onSelesai={() => setJenis(null)} />
        </Modal>
      )}
    </>
  );
}

// ======================= Isi modal =======================

const centang = "size-4 shrink-0 accent-green-700";
const kotakPilihan = "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 hover:bg-green-50";

function FormExport({
  jenis,
  tahunAjaran,
  taAwal,
  lokasi,
  onSelesai,
}: {
  jenis: Jenis;
  tahunAjaran: OpsiTA[];
  taAwal: number;
  lokasi: Lokasi[];
  onSelesai: () => void;
}) {
  const router = useRouter();
  const satuBulan = jenis === "inventaris"; // Inventaris = kondisi per satu bulan saja

  const [taId, setTaId] = useState(String(taAwal));
  const [bulan, setBulan] = useState<Set<string>>(new Set()); // kosong = semua bulan
  const [lokasiDipilih, setLokasiDipilih] = useState<Set<number>>(new Set(lokasi.map((l) => l.id)));
  const [hasil, setHasil] = useState<Hasil>("excel");
  const [perBulan, setPerBulan] = useState(false);
  const [proses, setProses] = useState("");

  const ta = tahunAjaran.find((t) => String(t.id) === taId)!;

  // Bulan yang ikut saat "Pisah per bulan": yang dicentang, atau semua bulan di tahun ajaran
  const bulanPisah = bulan.size ? ta.bulan.filter((b) => bulan.has(b.kode)) : ta.bulan;

  function gantiTA(v: string) {
    setTaId(v);
    setBulan(new Set()); // bulan tahun ajaran lain tidak berlaku
  }

  function toggleBulan(kode: string) {
    setBulan((lama) => {
      if (satuBulan) return lama.has(kode) ? new Set() : new Set([kode]);
      const baru = new Set(lama);
      if (baru.has(kode)) baru.delete(kode);
      else baru.add(kode);
      return baru;
    });
  }

  function toggleLokasi(id: number) {
    setLokasiDipilih((lama) => {
      const baru = new Set(lama);
      if (baru.has(id)) baru.delete(id);
      else baru.add(id);
      return baru;
    });
  }

  // daftarBulan diisi = pakai bulan itu saja (untuk download per bulan)
  function buatParam(daftarBulan?: string[]) {
    const p = new URLSearchParams({ jenis, ta: taId });
    (daftarBulan ?? [...bulan]).forEach((b) => p.append("bulan", b));
    // Semua lokasi dicentang = tidak perlu dikirim
    if (lokasiDipilih.size < lokasi.length) lokasiDipilih.forEach((id) => p.append("lokasi", String(id)));
    return p;
  }

  async function unduhExcel(p: URLSearchParams) {
    const res = await fetch(`/api/laporan/excel?${p}`);
    if (!res.ok) throw new Error(res.status === 404 ? "Route Excel tidak ditemukan (404)" : `Gagal membuat file Excel (${res.status})`);

    // Ambil nama file dari server
    const cd = res.headers.get("Content-Disposition") ?? "";
    const cocok = /filename\*=UTF-8''([^;]+)/.exec(cd);
    const nama = cocok ? decodeURIComponent(cocok[1]) : "laporan.xlsx";

    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = nama;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function lanjutkan() {
    if (lokasiDipilih.size === 0) {
      toast("Pilih minimal satu lokasi", "gagal");
      return;
    }
    const pisah = perBulan && bulanPisah.length > 0;

    // Cetak / PDF → laporan disiapkan di halaman ini juga, lalu jendela print browser terbuka
    if (hasil === "cetak") {
      const p = buatParam();
      if (pisah) p.set("perBulan", "1"); // tiap bulan mulai di halaman baru
      p.set("cetak", String(Date.now())); // angka unik supaya bisa cetak berulang kali
      router.push(`/admin/laporan?${p}`, { scroll: false });
      onSelesai();
      return;
    }

    try {
      if (pisah) {
        // Satu file Excel per bulan
        for (let i = 0; i < bulanPisah.length; i++) {
          setProses(`Mengunduh ${i + 1}/${bulanPisah.length}...`);
          await unduhExcel(buatParam([bulanPisah[i].kode]));
          await jeda(600); // beri jeda supaya browser tidak menolak download beruntun
        }
        toast(`${bulanPisah.length} file Excel berhasil diunduh`, "sukses");
      } else {
        setProses("Membuat Excel...");
        await unduhExcel(buatParam());
        toast("File Excel berhasil diunduh", "sukses");
      }
      onSelesai();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal membuat file Excel", "gagal");
    } finally {
      setProses("");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Tahun ajaran */}
      <div className="flex flex-col gap-2">
        <label htmlFor="pilih-ta" className={labelClass}>Tahun Ajaran</label>
        <Select
          id="pilih-ta"
          name="ta"
          value={taId}
          onChange={gantiTA}
          bisaCari={false}
          opsi={tahunAjaran.map((t) => ({ value: String(t.id), label: `Tahun Ajaran ${t.nama}${t.aktif ? " (aktif)" : ""}` }))}
        />
      </div>

      {/* Bulan */}
      <fieldset className="flex flex-col gap-2">
        <legend className={`${labelClass} mb-2`}>
          Bulan{" "}
          <span className="font-normal text-gray-400">
            {satuBulan ? "(pilih satu, kondisi per akhir bulan itu)" : "(boleh lebih dari satu)"}
          </span>
        </legend>
        <label className={kotakPilihan}>
          <input type={satuBulan ? "radio" : "checkbox"} className={centang} checked={bulan.size === 0} onChange={() => setBulan(new Set())} />
          <b>{satuBulan ? "Terakhir (seluruh tahun ajaran)" : "Semua bulan"}</b>
        </label>
        {ta.bulan.length === 0 ? (
          <p className="px-2 text-xs text-gray-400">Belum ada bulan pengecekan di tahun ajaran ini.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-2 sm:grid-cols-3">
            {ta.bulan.map((b) => (
              <label key={b.kode} className={kotakPilihan}>
                <input type={satuBulan ? "radio" : "checkbox"} className={centang} checked={bulan.has(b.kode)} onChange={() => toggleBulan(b.kode)} />
                {b.label}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      {/* Lokasi */}
      <fieldset className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <legend className={labelClass}>
            Lokasi <span className="font-normal text-gray-400">({lokasiDipilih.size} dari {lokasi.length})</span>
          </legend>
          <div className="flex gap-1 text-xs font-semibold">
            <button type="button" onClick={() => setLokasiDipilih(new Set(lokasi.map((l) => l.id)))} className="rounded-md px-2 py-1 text-green-700 hover:bg-green-50">
              Pilih semua
            </button>
            <button type="button" onClick={() => setLokasiDipilih(new Set())} className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100">
              Kosongkan
            </button>
          </div>
        </div>
        <div className="grid max-h-48 grid-cols-2 gap-x-2 overflow-y-auto rounded-xl border border-gray-100 p-1">
          {lokasi.map((l) => (
            <label key={l.id} className={kotakPilihan}>
              <input type="checkbox" className={centang} checked={lokasiDipilih.has(l.id)} onChange={() => toggleLokasi(l.id)} />
              <span className="truncate">{l.nama}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Hasil: Excel → Cetak / PDF */}
      <fieldset className="flex flex-col gap-2">
        <legend className={`${labelClass} mb-2`}>Hasil</legend>
        <div className="grid grid-cols-2 gap-2">
          {PILIHAN_HASIL.map((h) => (
            <label
              key={h.nilai}
              className={`flex cursor-pointer flex-col gap-0.5 rounded-xl border p-3 ${
                hasil === h.nilai ? "border-green-600 bg-green-50" : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <input type="radio" name="hasil" className={centang} checked={hasil === h.nilai} onChange={() => setHasil(h.nilai)} />
                {h.label}
              </span>
              <span className="pl-6 text-[11px] text-gray-500">{h.ket}</span>
            </label>
          ))}
        </div>

        {/* Pisah per bulan */}
        {ta.bulan.length > 0 && (
          <label className={`${kotakPilihan} mt-1 items-start rounded-xl border border-gray-200 p-3`}>
            <input type="checkbox" className={`${centang} mt-0.5`} checked={perBulan} onChange={(e) => setPerBulan(e.target.checked)} />
            <span>
              <b>Pisah per bulan</b>
              <span className="block text-[11px] text-gray-500">
                {hasil === "excel"
                  ? `${bulanPisah.length} file Excel, satu file untuk tiap bulan.`
                  : `${bulanPisah.length} bulan dalam 1 kali print, tiap bulan mulai di halaman baru.`}
              </span>
            </span>
          </label>
        )}
      </fieldset>

      <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
        <button type="button" onClick={onSelesai} className={btnSecondary}>Batal</button>
        <button type="button" onClick={lanjutkan} disabled={!!proses} className={btnPrimary}>
          {proses || (hasil === "cetak" ? "Cetak / PDF" : "Download Excel")}
        </button>
      </div>
    </div>
  );
}