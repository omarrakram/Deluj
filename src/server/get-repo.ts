import "server-only";
import { env, missingSupabaseVars } from "./env";

import { memoryRepo } from "./memory-repo";
import type { Repo } from "./repo";
import { supabaseRepo } from "./supabase-repo";

export function supabaseConfigured(): boolean {
  return missingSupabaseVars().length === 0;
}

/** Explicitly asked for the in-memory backend (local / LAN demo). */
export function memoryForced(): boolean {
  return env.backend() === "memory";
}

let warned = false;

/** Supabase when fully configured; otherwise the in-memory server. */
export function getRepo(): Repo {
  if (memoryForced()) return memoryRepo;
  if (supabaseConfigured()) return supabaseRepo;
  if (env.onVercel() && !warned) {
    warned = true;
    console.error(
      `[deluj] Supabase is not configured on this Vercel deployment (missing: ${missingSupabaseVars().join(", ")}). ` +
        "Falling back to the in-memory backend, which does NOT sync across devices on serverless.",
    );
  }
  return memoryRepo;
}
