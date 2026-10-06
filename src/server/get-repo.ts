import "server-only";

import { memoryRepo } from "./memory-repo";
import type { Repo } from "./repo";
import { supabaseRepo } from "./supabase-repo";

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Supabase when fully configured; otherwise the in-memory server. */
export function getRepo(): Repo {
  if (process.env.DELUJ_BACKEND === "memory") return memoryRepo;
  return supabaseConfigured() ? supabaseRepo : memoryRepo;
}
