import { afterEach, describe, expect, it, vi } from "vitest";
import jsQR from "jsqr";
import sharp from "sharp";
import { env, keyKind, missingSupabaseVars } from "@/server/env";
import { orderUrl, originFrom, qrSvg } from "@/server/qr";

afterEach(() => vi.unstubAllEnvs());

const clear = () => {
  for (const k of [
    "NEXT_PUBLIC_SITE_URL", "SITE_URL", "VERCEL", "VERCEL_ENV", "VERCEL_PROJECT_PRODUCTION_URL",
    "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY",
  ]) vi.stubEnv(k, "");
};

describe("QR target URL", () => {
  it("uses the domain the card was opened on by default", () => {
    clear();
    expect(orderUrl("http://192.168.1.20:3000", "table-07")).toBe("http://192.168.1.20:3000/order/table-07");
  });
  it("prefers the public production domain on Vercel production, never a protected deployment URL", () => {
    clear();
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "deluj.vercel.app");
    expect(orderUrl("https://deluj-a1b2c3-team.vercel.app", "table-07")).toBe("https://deluj.vercel.app/order/table-07");
  });
  it("keeps preview deployments on their own domain", () => {
    clear();
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "deluj.vercel.app");
    expect(orderUrl("https://deluj-git-x.vercel.app", "table-07")).toBe("https://deluj-git-x.vercel.app/order/table-07");
  });
  it("lets NEXT_PUBLIC_SITE_URL win, with or without a scheme or trailing slash", () => {
    clear();
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "deluj.vercel.app");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "order.deluj.com/");
    expect(orderUrl("https://x.vercel.app", "table-07")).toBe("https://order.deluj.com/order/table-07");
  });
  it("reads the public host behind a proxy", () => {
    const h = new Headers({ host: "internal:3000", "x-forwarded-host": "deluj.vercel.app", "x-forwarded-proto": "https" });
    expect(originFrom(h)).toBe("https://deluj.vercel.app");
    expect(originFrom(new Headers({ host: "localhost:3000" }))).toBe("http://localhost:3000");
  });
});

describe("Supabase configuration", () => {
  it("names what is missing", () => {
    clear();
    expect(missingSupabaseVars()).toEqual(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]);
  });
  it("accepts the new publishable / secret key names", () => {
    clear();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_x");
    expect(missingSupabaseVars()).toEqual([]);
  });
});

describe("branded QR", () => {
  it("decodes to the table URL at print and camera sizes", async () => {
    const url = "https://deluj.vercel.app/order/table-07";
    const svg = qrSvg(url, { px: 1200 });
    expect(svg).toContain('width="1200"');
    for (const size of [1200, 240]) {
      const { data, info } = await sharp(Buffer.from(svg)).resize(size, size).flatten({ background: "#fff" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      expect(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data).toBe(url);
    }
  });
});

describe("Supabase key guard", () => {
  const jwt = (role: string) => `x.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.y`;
  it("tells publishable keys from secret keys, new and legacy formats", () => {
    expect(keyKind("sb_publishable_abc")).toBe("public");
    expect(keyKind("sb_secret_abc")).toBe("secret");
    expect(keyKind(jwt("anon"))).toBe("public");
    expect(keyKind(jwt("service_role"))).toBe("secret");
    expect(keyKind("nonsense")).toBe("unknown");
    expect(keyKind(undefined)).toBe("unknown");
  });
  it("never sends a secret key to the browser when the two are swapped", () => {
    clear();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_secret_x");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_publishable_x");
    expect(env.supabaseAnonKey()).toBeUndefined();
    expect(env.supabaseServiceKey()).toBeUndefined();
    expect(missingSupabaseVars()).toEqual(["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]);
  });
});
