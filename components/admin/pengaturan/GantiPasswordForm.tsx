"use client";

import { useActionState } from "react";
import { gantiPassword } from "@/app/admin/pengaturan/actions";
import { btnPrimary, inputClass, labelClass } from "@/components/admin/ui";

export default function GantiPasswordForm() {
  const [state, formAction, pending] = useActionState(gantiPassword, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}
      {state.ok && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Password berhasil diubah.
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="lama" className={labelClass}>Password lama</label>
        <input id="lama" name="lama" type="password" required autoComplete="current-password" className={inputClass} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="baru" className={labelClass}>Password baru</label>
        <input id="baru" name="baru" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="ulang" className={labelClass}>Ulangi password baru</label>
        <input id="ulang" name="ulang" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Menyimpan..." : "Ganti Password"}
        </button>
      </div>
    </form>
  );
}