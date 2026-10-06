import "server-only";
import { env } from "./env";

import { memoryRepo } from "./memory-repo";
import type { Repo } from "./repo";
import { supabaseRepo } from "./supabase-repo";

export function supabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl() && env.supabaseServiceKey() && env.supabaseAnonKey());
}

/** Supabase when fully configured; otherwise the in-memory server. */
export function getRepo(): Repo {
  if (env.backend() === "memory") return memoryRepo;
  return supabaseConfigured() ? supabaseRepo : memoryRepo;
}
