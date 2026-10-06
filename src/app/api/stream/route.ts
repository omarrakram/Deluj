// Server-Sent Events for the in-memory backend. (With Supabase configured,
// screens subscribe to Supabase Realtime directly and this route is unused.)
import { parseTableCode } from "@/domain/tables";
import type { Change } from "@/domain/types";
import { getRepo } from "@/server/get-repo";
import { subscribeMemory } from "@/server/memory-repo";

export const dynamic = "force-dynamic";

function visibleTo(change: Change, tableCode: string | null): boolean {
  if (!tableCode) return true;
  switch (change.table) {
    case "orders":
      return change.row.tableCode === tableCode;
    case "requests":
      return change.row.tableCode === tableCode;
    case "activity":
    case "sessions":
      return false;
    default:
      return true;
  }
}

export async function GET(request: Request) {
  if (getRepo().kind !== "memory") {
    return new Response("Realtime is served by Supabase.", { status: 404 });
  }
  const tableCode = parseTableCode(new URL(request.url).searchParams.get("table"));
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      };
      send("ready", { serverTime: Date.now() });
      const unsubscribe = subscribeMemory((msg) => {
        if (msg.reset) return send("reset", {});
        const changes = msg.changes.filter((c) => visibleTo(c, tableCode));
        if (changes.length) send("changes", changes);
      });
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keep-alive ${Date.now()}\n\n`));
        } catch {
          cleanup();
        }
      }, 15_000);
      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      request.signal.addEventListener("abort", () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
