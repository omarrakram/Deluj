// Deluj runs on Cairo time. "Today", opening hours and peak hours are always
// computed in Africa/Cairo, whatever timezone the viewing device is in.

export const CAIRO_TZ = "Africa/Cairo";

const partsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: CAIRO_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});

export interface CairoParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday */
  weekday: number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function cairoParts(date: Date | string | number): CairoParts {
  const d = date instanceof Date ? date : new Date(date);
  const out: Record<string, string> = {};
  for (const p of partsFmt.formatToParts(d)) out[p.type] = p.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour) % 24,
    minute: Number(out.minute),
    second: Number(out.second),
    weekday: WEEKDAYS.indexOf(out.weekday),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Cairo calendar date, YYYY-MM-DD. */
export function cairoDateKey(date: Date | string | number): string {
  const p = cairoParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function cairoHour(date: Date | string | number): number {
  return cairoParts(date).hour;
}

/** Minutes since Cairo midnight. */
export function cairoMinuteOfDay(date: Date | string | number): number {
  const p = cairoParts(date);
  return p.hour * 60 + p.minute;
}

/** UTC instant for a Cairo wall-clock time on a Cairo date (handles Egypt's DST). */
export function cairoWallToUtc(dateKey: string, minuteOfDay: number, second = 0): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const h = Math.floor(minuteOfDay / 60);
  const mi = minuteOfDay % 60;
  const asUtc = Date.UTC(y, m - 1, d, h, mi, second);
  // Cairo is UTC+2 or UTC+3; resolve the actual offset at that instant.
  let guess = asUtc - 2 * 3600_000;
  for (let i = 0; i < 2; i++) {
    const p = cairoParts(guess);
    const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    guess += asUtc - wall;
  }
  return new Date(guess);
}

export function addDaysToKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function weekdayOfKey(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function minutesBetween(from: string | number | Date, to: string | number | Date): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / 60_000;
}

/** "just now", "1 min ago", "12 min ago", "2 h ago" */
export function relativeTime(from: string | number | Date, now: number): string {
  const mins = Math.floor(minutesBetween(from, now));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  return `${h} h ago`;
}

/** mm:ss elapsed timer for the kitchen. */
export function elapsedClock(from: string | number | Date, now: number): string {
  const secs = Math.max(0, Math.floor((now - new Date(from).getTime()) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${pad(m)}:${pad(s)}`;
}

export function formatCairoTime(date: Date | string | number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CAIRO_TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatHourLabel(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 ? "am" : "pm"}`;
}

export function greetingFor(date: Date | number): "Good Morning" | "Good Afternoon" | "Good Evening" {
  const h = cairoHour(date);
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export function formatCairoDate(date: Date | number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CAIRO_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(date));
}
