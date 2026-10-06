import "server-only";

// Read configuration at request time (not inlined at build time), so changing
// an environment variable only needs a restart/redeploy, never a code change.
// Supabase's dashboard now issues "publishable" and "secret" keys; the legacy
// "anon" and "service_role" names are accepted too.
function read(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

function first(...names: string[]): string | undefined {
  for (const n of names) {
    const v = read(n);
    if (v) return v;
  }
  return undefined;
}

export const SUPABASE_VARS = {
  url: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"],
  anonKey: ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY"],
  serviceKey: ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"],
} as const;

export const env = {
  supabaseUrl: () => first(...SUPABASE_VARS.url),
  supabaseAnonKey: () => first(...SUPABASE_VARS.anonKey),
  supabaseServiceKey: () => first(...SUPABASE_VARS.serviceKey),
  siteUrl: () => first("NEXT_PUBLIC_SITE_URL", "SITE_URL"),
  accessCode: () => read("DELUJ_ACCESS_CODE"),
  backend: () => read("DELUJ_BACKEND"),
  /** Set by Vercel on every deployment. */
  onVercel: () => Boolean(read("VERCEL")),
  vercelEnv: () => read("VERCEL_ENV"),
  /** Vercel system variable: the project's public production domain (no scheme). */
  vercelProductionHost: () => read("VERCEL_PROJECT_PRODUCTION_URL"),
};

/** Which Supabase settings are missing (empty when fully configured). */
export function missingSupabaseVars(): string[] {
  const missing: string[] = [];
  if (!env.supabaseUrl()) missing.push(SUPABASE_VARS.url[0]);
  if (!env.supabaseAnonKey()) missing.push(SUPABASE_VARS.anonKey[0]);
  if (!env.supabaseServiceKey()) missing.push(SUPABASE_VARS.serviceKey[0]);
  return missing;
}
