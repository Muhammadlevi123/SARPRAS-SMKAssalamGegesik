"use client";

import { useState } from "react";
import Select, { type OpsiSelect } from "./Select";

// Select untuk form filter (GET). Nilainya ikut terkirim saat klik "Terapkan".
export default function SelectFilter({
  name,
  defaultValue,
  opsi,
  label,
  bisaCari = false,
  className,
}: {
  name: string;
  defaultValue: string;
  opsi: OpsiSelect[];
  label: string;
  bisaCari?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <Select
      id={`filter-${name}`}
      name={name}
      value={value}
      onChange={setValue}
      opsi={opsi}
      bisaCari={bisaCari}
      ariaLabel={label}
      className={className}
    />
  );
}