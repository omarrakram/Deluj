const egp = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** "EGP 1,245" — every price in the product goes through here. */
export function formatEGP(amount: number): string {
  return `EGP ${egp.format(Math.round(amount))}`;
}

/** "+EGP 45" for add-ons and deltas. */
export function formatEGPDelta(amount: number): string {
  const sign = amount >= 0 ? "+" : "−";
  return `${sign}EGP ${egp.format(Math.abs(Math.round(amount)))}`;
}

export function formatNumber(n: number): string {
  return egp.format(Math.round(n));
}

/** Compact for chart axes: 12.4k */
export function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(n));
}

export function formatPercent(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}
