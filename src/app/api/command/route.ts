import { cookies } from "next/headers";
import { ACCESS_COOKIE, isAuthorized, isGuestCommand } from "@/server/access";
import { getRepo } from "@/server/get-repo";
import { parseCommand } from "@/lib/parse-command";

export const dynamic = "force-dynamic";

const STATUS_BY_CODE: Record<string, number> = {
  invalid_table: 404,
  not_found: 404,
  sold_out: 409,
  invalid_transition: 409,
  rate_limited: 429,
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ result: { ok: false, code: "invalid", message: "Something went wrong. Please try again." } }, { status: 400 });
  }
  const cmd = parseCommand(body);
  if (!cmd) {
    return Response.json({ result: { ok: false, code: "invalid", message: "Something went wrong. Please try again." } }, { status: 400 });
  }
  if (!isGuestCommand(cmd)) {
    const jar = await cookies();
    if (!isAuthorized(jar.get(ACCESS_COOKIE)?.value)) {
      return Response.json({ result: { ok: false, code: "unauthorized", message: "Please enter the team access code." } }, { status: 401 });
    }
  }
  try {
    const out = await getRepo().execute(cmd);
    const status = out.result.ok ? 200 : (STATUS_BY_CODE[out.result.code] ?? 400);
    return Response.json(out, { status, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[command]", cmd.type, err);
    return Response.json(
      { result: { ok: false, code: "unavailable", message: "We couldn't reach the kitchen. Please try again." } },
      { status: 503 },
    );
  }
}
