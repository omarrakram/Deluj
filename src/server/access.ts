// Optional shared access code for /staff and /owner. When DELUJ_ACCESS_CODE is
// unset the demo is frictionless; when set, privileged screens and commands
// require a cookie proving the code was entered. Swappable for Supabase Auth
// roles (staff / owner) without touching the screens.
import "server-only";
import { env } from "./env";

import { createHash, timingSafeEqual } from "node:crypto";
import type { Command } from "@/domain/types";

export const ACCESS_COOKIE = "deluj_access";

export function accessCode(): string | null {
  return env.accessCode() ?? null;
}

export function accessToken(code: string): string {
  return createHash("sha256").update(`deluj-demo:${code}`).digest("hex");
}

export function isAuthorized(cookieValue: string | undefined | null): boolean {
  const code = accessCode();
  if (!code) return true;
  if (!cookieValue) return false;
  const a = Buffer.from(accessToken(code));
  const b = Buffer.from(cookieValue);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function codeMatches(input: string): boolean {
  const code = accessCode();
  if (!code) return true;
  const a = Buffer.from(accessToken(code));
  const b = Buffer.from(accessToken(String(input ?? "").trim()));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Guests may order, ask for help and open their table. Everything else is staff/owner. */
export function isGuestCommand(cmd: Command): boolean {
  return cmd.type === "placeOrder" || cmd.type === "createRequest" || cmd.type === "openTable";
}
