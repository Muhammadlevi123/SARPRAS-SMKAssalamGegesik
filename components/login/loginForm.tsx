"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

const inputClass =
  "h-14 w-full rounded-xl border border-green-100 bg-green-50 px-5 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/20";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-semibold text-gray-700">
          Username
        </label>
        <input
          id="email"
          name="email"
          type="text"
          required
          autoFocus
          autoComplete="username"
          defaultValue={state.email}
          placeholder="Masukkan username"
          suppressHydrationWarning
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-semibold text-gray-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Masukkan password"
          suppressHydrationWarning
          className={inputClass}
        />
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
          "Masuk"
        )}
      </button>
    </form>
  );
}