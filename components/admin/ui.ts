// HP: huruf input 16px (text-base) supaya iPhone tidak zoom sendiri saat mengetik.
// Layar lebar: 14px (text-sm) seperti semula.
export const inputClass =
  "h-11 w-full min-w-0 rounded-xl border border-green-100 bg-green-50/60 px-4 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/15 sm:text-sm";

export const labelClass = "text-sm font-semibold text-gray-700";

// active: → efek saat tombol disentuh di HP (hover tidak terasa di layar sentuh)
export const btnPrimary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-green-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-green-800 active:bg-green-900 disabled:cursor-not-allowed disabled:opacity-60";

export const btnSecondary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 active:bg-gray-100";

export const btnIcon =
  "grid size-9 place-items-center rounded-lg text-gray-500 transition hover:bg-green-50 hover:text-green-700 active:bg-green-100 active:text-green-700";