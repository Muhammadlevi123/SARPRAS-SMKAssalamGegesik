"use client";

import { useState } from "react";
import Modal from "@/components/admin/Modal";
import TombolHapus from "@/components/admin/TombolHapus";
import { hapusPengajuan } from "@/app/admin/pengajuan/actions";
import { btnSecondary } from "@/components/admin/ui";

export type BarisPengajuan = {
  id: number;
  tanggal: string; // sudah diformat di server, misal "1 November 2026, 13.51 WIB"
  lokasi: string;
  pengaju: string;
  alasan: string;
  bisaHapus: boolean;
  items: { id: number; nama: string; merk: string | null; jumlah: number; satuan: string }[];
};

const fmtAngka = (n: number) => n.toLocaleString("id-ID");

// Ringkasan barang: "Kunci torsi, Dongkrak +2 lainnya"
function ringkasBarang(items: BarisPengajuan["items"]) {
  const nama = items.slice(0, 2).map((i) => i.nama).join(", ");
  return items.length > 2 ? `${nama} +${items.length - 2} lainnya` : nama;
}

// Ikon mata (lihat detail)
function IkonMata() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function TabelPengajuan({ data, tampilLokasi }: { data: BarisPengajuan[]; tampilLokasi: boolean }) {
  const [dipilih, setDipilih] = useState<BarisPengajuan | null>(null);

  return (
    <>
      {/* ===== HP: daftar kartu ===== */}
      <section className="min-w-0 overflow-hidden rounded-3xl border border-green-100 bg-white shadow-sm md:hidden">
        <div className="border-b border-green-100 bg-green-50/60 px-4 py-3">
          <p className="font-semibold text-gray-900">{data.length} pengajuan</p>
          <p className="text-xs text-gray-500">Terbaru di atas</p>
        </div>

        <ul className="divide-y divide-gray-100">
          {data.map((p) => (
            <li key={p.id} className="min-w-0 p-4">
              {/* Ikon + barang + tanggal */}
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-green-100 text-green-700">
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13" />
                    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-gray-900">{ringkasBarang(p.items)}</p>
                  <p className="truncate text-xs text-gray-500">{p.tanggal}</p>
                </div>
              </div>

              {/* Kotak info */}
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-2xl bg-green-50/60 p-3">
                <div className="min-w-0">
                  <dt className="text-xs text-gray-500">Pengaju</dt>
                  <dd className="truncate text-sm font-semibold text-gray-800">{p.pengaju}</dd>
                </div>
                {tampilLokasi ? (
                  <div className="min-w-0">
                    <dt className="text-xs text-gray-500">Lokasi</dt>
                    <dd className="truncate text-sm font-semibold text-gray-800">{p.lokasi}</dd>
                  </div>
                ) : (
                  <div className="min-w-0">
                    <dt className="text-xs text-gray-500">Jumlah barang</dt>
                    <dd className="text-sm font-semibold text-gray-800">{p.items.length} jenis</dd>
                  </div>
                )}
                <div className="col-span-2 min-w-0">
                  <dt className="text-xs text-gray-500">Alasan</dt>
                  <dd className="line-clamp-2 break-words text-sm text-gray-700">{p.alasan}</dd>
                </div>
              </dl>

              {/* Aksi: Lihat Detail lebar + Hapus */}
              <div className={`mt-3 grid gap-2 ${p.bisaHapus ? "grid-cols-[1fr_auto]" : "grid-cols-1"}`}>
                <button
                  type="button"
                  onClick={() => setDipilih(p)}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 text-sm font-semibold text-green-700 active:bg-green-100"
                >
                  <IkonMata />
                  Lihat Detail
                </button>
                {p.bisaHapus && (
                  <div className="grid place-items-center rounded-xl border border-red-200 bg-red-50 px-1">
                    <TombolHapus action={hapusPengajuan} id={p.id} nama="pengajuan ini" />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ===== Desktop: tabel seperti semula ===== */}
      <div className="hidden overflow-x-auto rounded-3xl border border-green-100 bg-white shadow-sm md:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-green-100 bg-green-50/60 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-3 font-semibold">No</th>
              <th className="px-5 py-3 font-semibold">Tanggal</th>
              <th className="px-5 py-3 font-semibold">Pengaju</th>
              <th className="px-5 py-3 font-semibold">Barang</th>
              <th className="px-5 py-3 font-semibold">Alasan</th>
              {tampilLokasi && <th className="px-5 py-3 font-semibold">Lokasi</th>}
              <th className="px-5 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((p, i) => (
              <tr key={p.id}>
                <td className="px-5 py-3 text-gray-500">{i + 1}</td>
                <td className="whitespace-nowrap px-5 py-3 text-gray-600">{p.tanggal}</td>
                <td className="px-5 py-3 text-gray-700">{p.pengaju}</td>
                <td className="px-5 py-3 font-semibold text-gray-900">{ringkasBarang(p.items)}</td>
                <td className="max-w-[260px] px-5 py-3 text-gray-600">
                  <p className="truncate">{p.alasan}</p>
                </td>
                {tampilLokasi && <td className="px-5 py-3 text-gray-700">{p.lokasi}</td>}
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setDipilih(p)}
                      title="Lihat detail"
                      aria-label="Lihat detail"
                      className="rounded-lg p-2 text-gray-500 hover:bg-green-50 hover:text-green-700"
                    >
                      <IkonMata />
                    </button>
                    {p.bisaHapus && <TombolHapus action={hapusPengajuan} id={p.id} nama="pengajuan ini" />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== Detail pengajuan ===== */}
      {dipilih && (
        <Modal judul="Detail Pengajuan" onClose={() => setDipilih(null)}>
          <div className="flex min-w-0 flex-col gap-5">
            <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-1.5 text-sm sm:grid-cols-[90px_1fr]">
              <dt className="text-gray-500">Lokasi</dt>
              <dd className="min-w-0 break-words font-semibold text-gray-900">{dipilih.lokasi}</dd>
              <dt className="text-gray-500">Pengaju</dt>
              <dd className="min-w-0 break-words text-gray-800">{dipilih.pengaju}</dd>
              <dt className="text-gray-500">Tanggal</dt>
              <dd className="min-w-0 text-gray-800">{dipilih.tanggal}</dd>
            </dl>

            <div className="min-w-0">
              <p className="mb-2 text-sm font-semibold text-gray-700">
                Barang yang diajukan ({dipilih.items.length})
              </p>

              {/* HP: daftar (tidak melebar ke samping) */}
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 sm:hidden">
                {dipilih.items.map((it, i) => (
                  <li key={it.id} className="flex min-w-0 items-center gap-3 px-3 py-2.5 text-sm">
                    <span className="grid size-6 shrink-0 place-items-center rounded-md bg-green-100 text-xs font-bold text-green-700">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold text-gray-900">{it.nama}</p>
                      {it.merk && <p className="truncate text-xs text-gray-500">{it.merk}</p>}
                    </div>
                    <span className="shrink-0 text-right">
                      <b>{fmtAngka(it.jumlah)}</b> <span className="text-gray-500">{it.satuan}</span>
                    </span>
                  </li>
                ))}
              </ul>

              {/* Layar lebar: tabel seperti semula */}
              <div className="hidden overflow-hidden rounded-2xl border border-gray-100 sm:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-green-50/60 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-2 font-semibold">No</th>
                      <th className="px-4 py-2 font-semibold">Nama Barang</th>
                      <th className="px-4 py-2 font-semibold">Merk</th>
                      <th className="px-4 py-2 text-right font-semibold">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dipilih.items.map((it, i) => (
                      <tr key={it.id}>
                        <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-4 py-2 text-gray-900">{it.nama}</td>
                        <td className="px-4 py-2 text-gray-600">{it.merk ?? "–"}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-right">
                          <b>{fmtAngka(it.jumlah)}</b> {it.satuan}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="min-w-0">
              <p className="mb-2 text-sm font-semibold text-gray-700">Alasan</p>
              <p className="whitespace-pre-line break-words rounded-2xl bg-green-50/60 px-4 py-3 text-sm text-gray-700">
                {dipilih.alasan}
              </p>
            </div>

            {/* HP: tombol lebar penuh. Layar lebar: di kanan */}
            <div className="grid border-t border-gray-100 pt-4 sm:flex sm:justify-end">
              <button type="button" onClick={() => setDipilih(null)} className={`${btnSecondary} justify-center`}>
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}