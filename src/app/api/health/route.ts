import { getRepo } from "@/server/get-repo";

export const dynamic = "force-dynamic";

export async function GET() {
  const repo = getRepo();
  try {
    const state = await repo.snapshot({ tableCode: "table-07" });
    return Response.json({ ok: true, backend: repo.kind, transport: repo.transport, menuItems: state.menu.length, businessDate: state.meta.businessDate });
  } catch (err) {
    console.error("[health]", err);
    return Response.json({ ok: false, backend: repo.kind }, { status: 503 });
  }
}
