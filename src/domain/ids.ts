/** RFC4122 v4 id; works in browsers, Node and edge runtimes. */
export function newId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Deterministic uuid-shaped id for seeded rows (stable across devices/resets). */
export function seededId(seed: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const out: string[] = [];
  for (let round = 0; round < 4; round++) {
    for (let i = 0; i < seed.length; i++) {
      h1 = Math.imul(h1 ^ seed.charCodeAt(i), 16777619) >>> 0;
      h2 = Math.imul(h2 + seed.charCodeAt(i) + round, 2246822519) >>> 0;
    }
    out.push(((h1 ^ h2) >>> 0).toString(16).padStart(8, "0"));
    h1 = (h1 + 0x9e3779b9) >>> 0;
  }
  const hex = out.join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
