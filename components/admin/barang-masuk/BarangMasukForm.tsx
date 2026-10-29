"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import Combobox from "@/components/admin/Combobox";
import Select from "@/components/admin/Select";
import { toast } from "@/components/admin/Toaster";
import { tambahBarangMasuk } from "@/app/admin/barang-masuk/actions";
import type { FormState } from "@/lib/formState";
import { btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/admin/ui";
import { DAFTAR_SUMBER, SUMBER_LABEL, fmtRupiah, type SumberKode } from "@/lib/format";

type BarangOpsi = { id: number; nama: string; merk: string | null; satuan: string; lokasi: string };
type Opsi = { id: number; nama: string };

type Baris = {
  key: number;
  mode: "ada" | "baru";
  barangId: string;
  nama: string;
  merk: string;
  kategori: string;
  satuan: string;
  lokasiId: string;
  jumlah: string;
  harga: string;
};

type BarisBiaya = { key: number; nama: string; tanda: "+" | "-"; nominal: string };
type Foto = { blob: Blob; url: string; ukuran: number };

let kunciBerikut = 1;
const barisKosong = (): Baris => ({
  key: kunciBerikut++,
  mode: "ada",
  barangId: "",
  nama: "",
  merk: "",
  kategori: "",
  satuan: "",
  lokasiId: "",
  jumlah: "1",
  harga: "",
});
const biayaKosong = (): BarisBiaya => ({ key: kunciBerikut++, nama: "", tanda: "+", nominal: "" });

// Kecilkan foto di browser: sisi terpanjang 1600 px, JPEG, target < 900 KB
async function kecilkanFoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const skala = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * skala);
  const h = Math.round(bitmap.height * skala);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  for (const kualitas of [0.8, 0.7, 0.6, 0.5]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", kualitas));
    if (blob && (blob.size <= 900 * 1024 || kualitas === 0.5)) return blob;
  }
  throw new Error("Gagal memproses foto");
}

const ukuranKB = (b: number) => `${Math.round(b / 1024)} KB`;

export default function BarangMasukForm({
  barangList,
  lokasiList,
  mitraList,
  kategoriList,
  satuanList,
  merkList,
  namaBiayaList,
  hariIni,
}: {
  barangList: BarangOpsi[];
  lokasiList: Opsi[];
  mitraList: Opsi[];
  kategoriList: string[];
  satuanList: string[];
  merkList: string[];
  namaBiayaList: string[];
  hariIni: string;
}) {
  const router = useRouter();

  const [tanggal, setTanggal] = useState(hariIni);
  const [sumber, setSumber] = useState<SumberKode>("PEMBELIAN");
  const [noNota, setNoNota] = useState("");
  const [mitraId, setMitraId] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [baris, setBaris] = useState<Baris[]>(() => [barisKosong()]);
  const [biaya, setBiaya] = useState<BarisBiaya[]>([]);
  const [foto, setFoto] = useState<Foto | null>(null);
  const [prosesFoto, setProsesFoto] = useState(false);

  const pembelian = sumber === "PEMBELIAN";
  const butuhMitra = sumber === "MOU" || sumber === "BANTUAN";

  // ===== Barang =====
  const ubah = (key: number, data: Partial<Baris>) =>
    setBaris((bs) => bs.map((b) => (b.key === key ? { ...b, ...data } : b)));
  const hapusBaris = (key: number) => setBaris((bs) => (bs.length > 1 ? bs.filter((b) => b.key !== key) : bs));

  // Nama · merk di baris utama, lokasi di baris kecil di bawahnya
  const opsiBarang = barangList.map((b) => ({
    value: String(b.id),
    label: b.merk ? `${b.nama} · ${b.merk}` : b.nama,
    keterangan: b.lokasi,
  }));
  const opsiLokasi = lokasiList.map((l) => ({ value: String(l.id), label: l.nama }));

  const satuanBaris = (b: Baris) =>
    b.mode === "baru" ? b.satuan : barangList.find((x) => String(x.id) === b.barangId)?.satuan ?? "";
  const subtotal = (b: Baris) => (Number(b.jumlah) || 0) * (Number(b.harga) || 0);

  // ===== Biaya lain-lain =====
  const ubahBiaya = (key: number, data: Partial<BarisBiaya>) =>
    setBiaya((bs) => bs.map((b) => (b.key === key ? { ...b, ...data } : b)));
  const nilaiBiaya = (b: BarisBiaya) => (b.tanda === "-" ? -1 : 1) * (Number(b.nominal) || 0);
  const biayaTerisi = biaya.filter((b) => b.nama.trim() !== "" || b.nominal !== "");

  // ===== Total =====
  const subtotalBarang = baris.reduce((t, b) => t + subtotal(b), 0);
  const totalBiaya = biayaTerisi.reduce((t, b) => t + nilaiBiaya(b), 0);
  const totalBayar = subtotalBarang + totalBiaya;

  // ===== Foto =====
  async function pilihFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("File harus berupa foto/gambar", "gagal");
    if (file.size > 10 * 1024 * 1024) return toast("Ukuran foto maksimal 10 MB", "gagal");

    setProsesFoto(true);
    try {
      const blob = await kecilkanFoto(file);
      if (foto) URL.revokeObjectURL(foto.url);
      setFoto({ blob, url: URL.createObjectURL(blob), ukuran: blob.size });
    } catch {
      toast("Foto gagal diproses, coba foto lain", "gagal");
    } finally {
      setProsesFoto(false);
    }
  }

  function hapusFoto() {
    if (foto) URL.revokeObjectURL(foto.url);
    setFoto(null);
  }

  // ===== Kirim =====
  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      formData.set(
        "items",
        JSON.stringify(
          baris.map((b) => ({
            mode: b.mode,
            barangId: Number(b.barangId) || 0,
            nama: b.nama,
            merk: b.merk,
            kategori: b.kategori,
            satuan: b.satuan,
            lokasiId: Number(b.lokasiId) || 0,
            jumlah: Number(b.jumlah),
            harga: pembelian && b.harga !== "" ? Number(b.harga) : null,
          }))
        )
      );
      formData.set(
        "biayaLain",
        JSON.stringify(pembelian ? biayaTerisi.map((b) => ({ nama: b.nama, jumlah: nilaiBiaya(b) })) : [])
      );
      formData.delete("foto");
      if (pembelian && foto) formData.set("foto", foto.blob, "nota.jpg");

      const hasil = await tambahBarangMasuk(prev, formData);
      if (hasil.ok && hasil.id) {
        toast(hasil.pesan ?? "Barang masuk tersimpan", "sukses");
        router.push(`/admin/barang-masuk/${hasil.id}`);
      } else if (hasil.error) {
        toast(hasil.error, "gagal");
      }
      return hasil;
    },
    {}
  );

  const opsional = <span className="font-normal text-gray-400">(opsional)</span>;
  const labelKecil = "text-xs font-semibold text-gray-500";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      {/* ===== Data Nota ===== */}
      <section className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-900">Data Nota</h3>

        <div className="flex flex-col gap-4">
          <fieldset>
            <legend className={`${labelClass} mb-2`}>Sumber</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DAFTAR_SUMBER.map((s) => (
                <label
                  key={s}
                  className={`cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm font-semibold transition ${sumber === s
                      ? "border-green-600 bg-green-50 text-green-800 ring-2 ring-green-500/20"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  <input type="radio" name="sumber" value={s} checked={sumber === s} onChange={() => setSumber(s)} className="sr-only" />
                  {SUMBER_LABEL[s]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label htmlFor="tanggal" className={labelClass}>Tanggal</label>
              <input id="tanggal" name="tanggal" type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="noNota" className={labelClass}>
                {pembelian ? "No. Nota" : "No. Dokumen / BAST"} {opsional}
              </label>
              <input
                id="noNota"
                name="noNota"
                value={noNota}
                onChange={(e) => setNoNota(e.target.value)}
                placeholder={pembelian ? "2505199TGS5R6K" : "BAST/001/2026"}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="keterangan" className={labelClass}>Keterangan {opsional}</label>
              <input
                id="keterangan"
                name="keterangan"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Contoh: Dana BOS tahap 2"
                className={inputClass}
              />
            </div>
          </div>

          {butuhMitra && (
            <div className="flex flex-col gap-2 md:max-w-md">
              <label htmlFor="mitraId" className={labelClass}>
                Mitra {sumber === "BANTUAN" && opsional}
              </label>
              <Select
                id="mitraId"
                name="mitraId"
                value={mitraId}
                onChange={setMitraId}
                opsi={[
                  ...(sumber === "BANTUAN" ? [{ value: "", label: "Tanpa mitra" }] : []),
                  ...mitraList.map((m) => ({ value: String(m.id), label: m.nama })),
                ]}
                placeholder="Pilih mitra"
                required={sumber === "MOU"}
              />
            </div>
          )}

          {pembelian && (
            <div className="flex flex-col gap-2 md:max-w-md">
              <span className={labelClass}>Foto nota {opsional}</span>
              {foto ? (
                <div className="flex items-center gap-3 rounded-2xl border border-green-100 bg-green-50/40 p-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={foto.url} alt="Pratinjau foto nota" className="size-14 rounded-xl object-cover" />
                  <div className="flex-1 text-sm">
                    <p className="font-semibold text-gray-800">Foto siap diunggah</p>
                    <p className="text-xs text-gray-500">Sudah dikecilkan: {ukuranKB(foto.ukuran)}</p>
                  </div>
                  <button type="button" onClick={hapusFoto} className="px-2 text-sm font-semibold text-red-600 hover:underline">
                    Hapus
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-green-200 bg-green-50/30 px-4 py-3 transition hover:bg-green-50">
                  <svg viewBox="0 0 24 24" className="size-6 shrink-0 text-green-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7h3l2-3h6l2 3h3v13H4z" />
                    <path d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                  </svg>
                  <span className="text-sm">
                    <span className="font-semibold text-gray-700">{prosesFoto ? "Memproses foto..." : "Pilih / ambil foto nota"}</span>
                    <span className="block text-xs text-gray-400">Maks. 10 MB, otomatis dikecilkan</span>
                  </span>
                  <input type="file" accept="image/*" capture="environment" onChange={pilihFoto} disabled={prosesFoto} className="sr-only" />
                </label>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ===== Daftar Barang: kartu kecil berjajar ke samping ===== */}
      <section className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-gray-900">Daftar Barang ({baris.length})</h3>
          {pembelian && (
            <p className="text-sm text-gray-500">
              Subtotal <b className="text-gray-900">{fmtRupiah(subtotalBarang)}</b>
            </p>
          )}
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
          {baris.map((b, i) => {
            const satuan = satuanBaris(b);
            return (
              <div key={b.key} className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-gray-50/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-green-800">Barang #{i + 1}</span>
                  <button
                    type="button"
                    onClick={() => hapusBaris(b.key)}
                    disabled={baris.length === 1}
                    aria-label={`Hapus barang #${i + 1}`}
                    title="Hapus"
                    className="grid size-7 place-items-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:invisible"
                  >
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>

                {b.mode === "ada" ? (
                  <Select
                    id={`barang-${b.key}`}
                    name={`x-barang-${b.key}`}
                    value={b.barangId}
                    onChange={(v) => ubah(b.key, { barangId: v })}
                    opsi={opsiBarang}
                    placeholder="Cari & pilih barang"
                    ariaLabel={`Barang #${i + 1}`}
                    required
                  />
                ) : (
                  <>
                    <input
                      aria-label={`Nama barang baru #${i + 1}`}
                      required
                      value={b.nama}
                      onChange={(e) => ubah(b.key, { nama: e.target.value })}
                      placeholder="Nama barang baru"
                      className={inputClass}
                    />
                    <Select
                      id={`lokasi-${b.key}`}
                      name={`x-lokasi-${b.key}`}
                      value={b.lokasiId}
                      onChange={(v) => ubah(b.key, { lokasiId: v })}
                      opsi={opsiLokasi}
                      placeholder="Lokasi"
                      ariaLabel="Lokasi"
                      required
                    />
                    <Combobox
                      id={`satuan-${b.key}`}
                      name={`x-satuan-${b.key}`}
                      value={b.satuan}
                      onChange={(v) => ubah(b.key, { satuan: v })}
                      opsi={satuanList}
                      placeholder="Satuan"
                      required
                    />
                    <Combobox
                      id={`kategori-${b.key}`}
                      name={`x-kategori-${b.key}`}
                      value={b.kategori}
                      onChange={(v) => ubah(b.key, { kategori: v })}
                      opsi={kategoriList}
                      placeholder="Kategori (opsional)"
                    />
                    <Combobox
                      id={`merk-${b.key}`}
                      name={`x-merk-${b.key}`}
                      value={b.merk}
                      onChange={(v) => ubah(b.key, { merk: v })}
                      opsi={merkList}
                      placeholder="Merk (opsional)"
                    />
                  </>
                )}

                <div className={`grid gap-2 ${pembelian ? "grid-cols-2" : ""}`}>
                  <div className="flex flex-col gap-1">
                    <label htmlFor={`jumlah-${b.key}`} className={labelKecil}>
                      Jumlah{satuan ? ` (${satuan})` : ""}
                    </label>
                    <input
                      id={`jumlah-${b.key}`}
                      type="number"
                      min={1}
                      required
                      value={b.jumlah}
                      onChange={(e) => ubah(b.key, { jumlah: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  {pembelian && (
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`harga-${b.key}`} className={labelKecil}>Harga satuan</label>
                      <input
                        id={`harga-${b.key}`}
                        type="number"
                        min={0}
                        required
                        value={b.harga}
                        onChange={(e) => ubah(b.key, { harga: e.target.value })}
                        placeholder="Rp"
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => ubah(b.key, { mode: b.mode === "ada" ? "baru" : "ada" })}
                    className="text-xs font-semibold text-green-700 hover:underline"
                  >
                    {b.mode === "ada" ? "+ Barang baru" : "← Barang terdaftar"}
                  </button>
                  {pembelian && subtotal(b) > 0 && (
                    <span className="text-xs font-semibold text-gray-700">{fmtRupiah(subtotal(b))}</span>
                  )}
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setBaris((bs) => [...bs, barisKosong()])}
            className="flex min-h-40 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-green-200 text-sm font-semibold text-green-700 transition hover:bg-green-50"
          >
            <span className="text-2xl leading-none">+</span>
            Tambah barang
          </button>
        </div>
      </section>

      {/* ===== Biaya lain-lain & Total (khusus Pembelian) ===== */}
      {pembelian && (
        <section className="grid gap-5 rounded-3xl border border-green-100 bg-white p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Biaya lain-lain</h3>
                <p className="text-xs text-gray-500">Ongkir, biaya layanan, diskon, dll. Pilih − untuk potongan.</p>
              </div>
              <button
                type="button"
                onClick={() => setBiaya((bs) => [...bs, biayaKosong()])}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-50"
              >
                + Tambah biaya
              </button>
            </div>

            {biaya.length === 0 ? (
              <p className="rounded-2xl border-2 border-dashed border-gray-200 px-4 py-5 text-center text-sm text-gray-400">
                Tidak ada biaya lain-lain
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {biaya.map((b, i) => (
                  <li key={b.key} className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_9rem_2.25rem]">
                    <Combobox
                      id={`biaya-nama-${b.key}`}
                      name={`x-biaya-${b.key}`}
                      value={b.nama}
                      onChange={(v) => ubahBiaya(b.key, { nama: v })}
                      opsi={namaBiayaList}
                      placeholder={`Biaya #${i + 1}, misal Ongkos kirim`}
                      required
                    />
                    {/* Tambahan atau potongan */}
                    <div className="flex h-11 rounded-xl border border-gray-200 bg-white p-0.5 text-sm font-bold">
                      {(["+", "-"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => ubahBiaya(b.key, { tanda: t })}
                          aria-label={t === "+" ? "Tambahan" : "Potongan"}
                          title={t === "+" ? "Tambahan" : "Potongan"}
                          className={`w-10 rounded-lg ${b.tanda === t
                              ? t === "+"
                                ? "bg-green-700 text-white"
                                : "bg-red-600 text-white"
                              : "text-gray-500 hover:bg-gray-50"
                            }`}
                        >
                          {t === "+" ? "+" : "−"}
                        </button>
                      ))}
                    </div>
                    <input
                      aria-label={`Nominal biaya #${i + 1}`}
                      type="number"
                      min={1}
                      required
                      value={b.nominal}
                      onChange={(e) => ubahBiaya(b.key, { nominal: e.target.value })}
                      placeholder="Rp"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setBiaya((bs) => bs.filter((x) => x.key !== b.key))}
                      aria-label={`Hapus biaya #${i + 1}`}
                      title="Hapus"
                      className="grid size-9 place-items-center justify-self-end rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Ringkasan total */}
          <dl className="h-fit rounded-2xl bg-green-50/60 p-4 text-sm">
            <div className="flex justify-between py-1">
              <dt className="text-gray-600">Subtotal barang</dt>
              <dd className="font-semibold text-gray-900">{fmtRupiah(subtotalBarang)}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-gray-600">Biaya lain-lain</dt>
              <dd className={`font-semibold ${totalBiaya < 0 ? "text-red-600" : "text-gray-900"}`}>
                {totalBiaya < 0 ? `−${fmtRupiah(-totalBiaya)}` : fmtRupiah(totalBiaya)}
              </dd>
            </div>
            <div className="mt-2 flex justify-between border-t border-green-200 pt-3 text-base">
              <dt className="font-bold text-gray-900">Total pembayaran</dt>
              <dd className="font-bold text-green-800">{fmtRupiah(totalBayar)}</dd>
            </div>
          </dl>
        </section>
      )}

      <div className="flex justify-end gap-3">
        <Link href="/admin/barang-masuk" className={btnSecondary}>Batal</Link>
        <button type="submit" disabled={pending || prosesFoto} className={btnPrimary}>
          {pending ? "Menyimpan..." : "Simpan Barang Masuk"}
        </button>
      </div>
    </form>
  );
}