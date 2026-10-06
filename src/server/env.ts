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

/** What kind of Supabase key a value is, from its prefix or JWT role claim. */
export function keyKind(key: string | undefined): "public" | "secret" | "unknown" {
  if (!key) return "unknown";
  if (key.startsWith("sb_publishable_")) return "public";
  if (key.startsWith("sb_secret_")) return "secret";
  const parts = key.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { role?: string };
      if (payload.role === "service_role") return "secret";
      if (payload.role === "anon") return "public";
    } catch {
      /* not a JWT */
    }
  }
  return "unknown";
}

let warnedSwap = false;
function warnSwap(message: string) {
  if (warnedSwap) return;
  warnedSwap = true;
  console.error(`[deluj] ${message}`);
}

export const env = {
  supabaseUrl: () => first(...SUPABASE_VARS.url),
  /** Sent to every browser — refuses a secret key placed here by mistake. */
  supabaseAnonKey: () => {
    const key = first(...SUPABASE_VARS.anonKey);
    if (keyKind(key) === "secret") {
      warnSwap("NEXT_PUBLIC_SUPABASE_ANON_KEY holds a SECRET key. It will not be sent to browsers — use the publishable / anon key.");
      return undefined;
    }
    return key;
  },
  supabaseServiceKey: () => {
    const key = first(...SUPABASE_VARS.serviceKey);
    if (keyKind(key) === "public") {
      warnSwap("SUPABASE_SERVICE_ROLE_KEY holds the publishable / anon key. Use the secret / service_role key.");
      return undefined;
    }
    return key;
  },
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
