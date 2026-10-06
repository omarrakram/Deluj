import { parseTableCode } from "@/domain/tables";
import { env } from "@/server/env";
import { getRepo } from "@/server/get-repo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawTable = url.searchParams.get("table");
  const tableCode = rawTable ? parseTableCode(rawTable) : undefined;
  if (rawTable && !tableCode) {
    return Response.json({ error: "We couldn't find that table." }, { status: 404 });
  }
  const repo = getRepo();
  try {
    // Answer within 7 s even if the database stalls, so screens fall back to polling quickly.
    const state = await Promise.race([
      repo.snapshot({ tableCode: tableCode ?? undefined }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("snapshot timed out")), 7_000)),
    ]);
    const supabase =
      repo.transport === "supabase"
        ? { url: env.supabaseUrl()!, anonKey: env.supabaseAnonKey()! }
        : undefined;
    return Response.json(
      { transport: repo.transport, backend: repo.kind, serverTime: Date.now(), state, supabase },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[state]", err);
    return Response.json({ error: "Deluj is reconnecting. One moment." }, { status: 503 });
  }
}
