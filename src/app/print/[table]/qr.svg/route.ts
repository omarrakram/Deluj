import { parseTableCode } from "@/domain/tables";
import { orderUrl, originFrom, qrSvg } from "@/server/qr";

export async function GET(request: Request, ctx: RouteContext<"/print/[table]/qr.svg">) {
  const { table } = await ctx.params;
  const code = parseTableCode(table);
  if (!code) return new Response("Unknown table", { status: 404 });
  const svg = qrSvg(orderUrl(originFrom(request.headers), code));
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="deluj-${code}-qr.svg"`,
      "Cache-Control": "no-store",
    },
  });
}
