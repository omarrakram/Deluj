"use client";

import { Minus, Plus, Trash2 } from "lucide-react";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  size = "md",
  removable = false,
  label = "Quantity",
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  removable?: boolean;
  label?: string;
}) {
  const btn = size === "sm" ? "h-8 w-8" : "h-11 w-11";
  const canRemove = removable && value <= min;
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-white p-1 shadow-soft" role="group" aria-label={label}>
      <button
        type="button"
        className={`${btn} grid place-items-center rounded-full text-ink transition active:scale-90 disabled:opacity-30 ${canRemove ? "text-orange-deep" : ""}`}
        onClick={() => onChange(value - 1)}
        disabled={!removable && value <= min}
        aria-label={canRemove ? "Remove" : "Decrease"}
      >
        {canRemove ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
      </button>
      <span className={`tabular min-w-6 text-center font-display font-bold ${size === "sm" ? "text-sm" : "text-lg"}`} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={`${btn} grid place-items-center rounded-full bg-orange text-white transition active:scale-90 disabled:opacity-30`}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Increase"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
