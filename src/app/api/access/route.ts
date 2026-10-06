import { cookies } from "next/headers";
import { ACCESS_COOKIE, accessCode, accessToken, codeMatches } from "@/server/access";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { code?: string };
  const code = accessCode();
  if (!code) return Response.json({ ok: true });
  if (!codeMatches(String(body.code ?? ""))) {
    return Response.json({ ok: false, message: "That code didn't work. Try again." }, { status: 401 });
  }
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, accessToken(code), {
    httpOnly: true,
    sameSite: "lax",
    // Secure only over HTTPS, so the plain-HTTP LAN/hotspot backup can still sign in.
    secure: (request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "")) === "https",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return Response.json({ ok: true });
}
