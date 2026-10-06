// Deluj floor: tables 01–14. Table codes are URL-safe ("table-07").

export const TABLE_COUNT = 14;

export const TABLE_CODES: string[] = Array.from(
  { length: TABLE_COUNT },
  (_, i) => `table-${String(i + 1).padStart(2, "0")}`,
);

/** Accepts "table-07", "TABLE-7", "t7", "07", "7". Returns the canonical code or null. */
export function parseTableCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = String(raw).trim().toLowerCase().match(/^(?:table-?|t)?0*(\d{1,2})$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isInteger(n) || n < 1 || n > TABLE_COUNT) return null;
  return `table-${String(n).padStart(2, "0")}`;
}

export function tableLabel(code: string | null | undefined): string {
  if (!code) return "Counter";
  const n = code.replace(/^table-/, "");
  return `Table ${n}`;
}

export function tableNumber(code: string): string {
  return code.replace(/^table-/, "");
}
