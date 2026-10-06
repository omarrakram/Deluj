import "server-only";

// Read configuration at request time (not inlined at build time), so changing
// an environment variable only needs a restart/redeploy, never a code change.
function read(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export const env = {
  supabaseUrl: () => read("NEXT_PUBLIC_SUPABASE_URL") ?? read("SUPABASE_URL"),
  supabaseAnonKey: () => read("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? read("SUPABASE_ANON_KEY"),
  supabaseServiceKey: () => read("SUPABASE_SERVICE_ROLE_KEY"),
  siteUrl: () => read("NEXT_PUBLIC_SITE_URL") ?? read("SITE_URL"),
  accessCode: () => read("DELUJ_ACCESS_CODE"),
  backend: () => read("DELUJ_BACKEND"),
};
