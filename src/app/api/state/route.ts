import { parseTableCode } from "@/domain/tables";
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
    const state = await repo.snapshot({ tableCode: tableCode ?? undefined });
    const supabase =
      repo.transport === "supabase"
        ? { url: process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! }
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
