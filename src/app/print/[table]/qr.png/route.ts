import sharp from "sharp";
import { parseTableCode } from "@/domain/tables";
import { orderUrl, originFrom, qrSvg } from "@/server/qr";

export const runtime = "nodejs";

export async function GET(request: Request, ctx: RouteContext<"/print/[table]/qr.png">) {
  const { table } = await ctx.params;
  const code = parseTableCode(table);
  if (!code) return new Response("Unknown table", { status: 404 });
  const svg = qrSvg(orderUrl(originFrom(request.headers), code));
  const png = await sharp(Buffer.from(svg), { density: 600 }).resize(1600, 1600).png().toBuffer();
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="deluj-${code}-qr.png"`,
      "Cache-Control": "no-store",
    },
  });
}
