"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "@/components/admin/Toaster";
import type { FormState } from "@/lib/formState";

export default function TombolHapus({
  action,
  id,
  nama,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  id: number;
  nama: string;
}) {
  const [buka, setBuka] = useState(false);

  const [, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const hasil = await action(prev, formData);
      if (hasil.ok) toast(hasil.pesan ?? `"${nama}" berhasil dihapus`, "sukses");
      else if (hasil.error) toast(hasil.error, "gagal");
      setBuka(false);
      return hasil;
    },
    {}
  );

  const tutup = () => {
    if (!pending) setBuka(false);
  };

  // Tutup dengan tombol Esc
  useEffect(() => {
    if (!buka) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) setBuka(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [buka, pending]);

  return (
    <>
      {/* Tombol ikon tempat sampah di tabel */}
      <button
        type="button"
        onClick={() => setBuka(true)}
        aria-label={`Hapus ${nama}`}
        title="Hapus"
        className="grid size-9 place-items-center rounded-lg text-gray-500 transition hover:bg-red-50 hover:text-red-600"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
        </svg>
      </button>

      {/* Pop-up konfirmasi (kecil & rata tengah) */}
      {buka && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4"
          onClick={tutup}
        >
          <form
            action={formAction}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`hapus-judul-${id}`}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl"
          >
            <input type="hidden" name="id" value={id} />

            <div className="mx-auto grid size-12 place-items-center rounded-full bg-red-100 text-red-600">
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
              </svg>
            </div>

            <h3 id={`hapus-judul-${id}`} className="mt-4 text-base font-bold text-gray-900">
              Hapus data?
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              <b className="font-semibold text-gray-800">{nama}</b> akan dihapus permanen.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={tutup}
                disabled={pending}
                className="h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={pending}
                autoFocus
                className="h-10 rounded-xl bg-red-600 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}