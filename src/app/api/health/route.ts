import { headers } from "next/headers";
import { env, missingSupabaseVars } from "@/server/env";
import { getRepo, memoryForced } from "@/server/get-repo";
import { orderUrl, originFrom } from "@/server/qr";

export const dynamic = "force-dynamic";

// Deployment health: backend, database reachability and the URL the Table 07 QR encodes.
export async function GET() {
  const repo = getRepo();
  const qrTarget = orderUrl(originFrom(await headers()), "table-07");
  // On Vercel the in-memory backend cannot sync devices: report it as unhealthy.
  if (repo.kind === "memory" && env.onVercel() && !memoryForced()) {
    return Response.json(
      {
        ok: false,
        backend: repo.kind,
        error: "Supabase is not configured on this deployment, so devices will not stay in sync.",
        missing: missingSupabaseVars(),
        qrTarget,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const state = await repo.snapshot({ tableCode: "table-07" });
    return Response.json(
      {
        ok: true,
        backend: repo.kind,
        transport: repo.transport,
        menuItems: state.menu.length,
        businessDate: state.meta.businessDate,
        resetVersion: state.meta.resetVersion,
        qrTarget,
        accessCode: Boolean(env.accessCode()),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[health]", err);
    return Response.json({ ok: false, backend: repo.kind, error: "The database did not answer.", qrTarget }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
