"use client";

import Link from "next/link";
import { useActionState } from "react";
import { daftar, type DaftarState } from "@/app/daftar/actions";

const initialState: DaftarState = {};

const inputClass =
  "h-14 w-full rounded-xl border border-green-100 bg-green-50 px-5 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/20";
const labelClass = "text-sm font-semibold text-gray-700";

export default function DaftarForm({ mulai }: { mulai: number }) {
  const [state, formAction, pending] = useActionState(daftar, initialState);

  // ===== Berhasil: tampilkan pesan, tidak langsung login (menunggu admin) =====
  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-green-200 bg-green-50 px-6 py-8 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-green-600 text-white">
          <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5L19 7" />
          </svg>
        </span>
        <div>
          <p className="text-lg font-bold text-gray-900">Pendaftaran terkirim</p>
          <p className="mt-1 text-sm text-gray-600">
            Akun Anda menunggu persetujuan admin. Setelah admin menetapkan lokasi tanggung jawab Anda, silakan masuk
            dengan email dan password yang tadi didaftarkan.
          </p>
        </div>
        <Link
          href="/login"
          className="flex h-12 w-full items-center justify-center rounded-xl bg-green-700 text-base font-bold text-white transition hover:bg-green-800"
        >
          Ke halaman Masuk
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Waktu halaman dibuka (deteksi bot yang mengirim terlalu cepat) */}
      <input type="hidden" name="mulai" value={mulai} />

      {/* Honeypot: disembunyikan dari manusia & pembaca layar. Bot biasanya mengisinya. */}
      <div aria-hidden="true" className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="nama" className={labelClass}>Nama lengkap</label>
        <input
          id="nama"
          name="nama"
          type="text"
          required
          autoFocus
          minLength={3}
          maxLength={100}
          autoComplete="name"
          defaultValue={state.nama}
          placeholder="Contoh: Suhardi, S.Pd."
          suppressHydrationWarning
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className={labelClass}>Email</label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          required
          maxLength={254}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={state.email}
          placeholder="nama@email.com"
          suppressHydrationWarning
          className={inputClass}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className={labelClass}>Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
            suppressHydrationWarning
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="ulangiPassword" className={labelClass}>Ulangi password</label>
          <input
            id="ulangiPassword"
            name="ulangiPassword"
            type="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            placeholder="Ketik ulang"
            suppressHydrationWarning
            className={inputClass}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        suppressHydrationWarning
        className="mt-2 flex h-14 w-full items-center justify-center rounded-xl bg-gradient-to-r from-green-700 to-green-600 text-base font-bold text-white shadow-lg shadow-green-700/25 transition hover:-translate-y-px hover:from-green-800 hover:to-green-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? (
          <span className="size-6 animate-spin rounded-full border-[3px] border-white/35 border-t-white" />
        ) : (
          "Daftar"
        )}
      </button>
    </form>
  );
}