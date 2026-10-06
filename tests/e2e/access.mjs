// Shared helpers so the suites also run against a deployment that has
// DELUJ_ACCESS_CODE set (export the same code in the shell running the tests).
export const ACCESS_CODE = process.env.DELUJ_ACCESS_CODE?.trim() || null;

/** Cookie header proving the access code, or null when no code is configured. */
export async function accessCookie(base) {
  if (!ACCESS_CODE) return null;
  const res = await fetch(`${base}/api/access`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: ACCESS_CODE }) });
  if (!res.ok) throw new Error(`access code rejected (${res.status})`);
  const set = res.headers.get("set-cookie");
  return set ? set.split(";")[0] : null;
}

export function jsonHeaders(cookie) {
  return { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) };
}

/** Unlock /staff and /owner for a browser context. */
export async function unlockContext(ctx, base) {
  if (!ACCESS_CODE) return;
  const res = await ctx.request.post(`${base}/api/access`, { data: { code: ACCESS_CODE } });
  if (!res.ok()) throw new Error(`access code rejected (${res.status()})`);
}
