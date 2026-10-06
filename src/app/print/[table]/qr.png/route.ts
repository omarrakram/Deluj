import sharp from "sharp";
import { parseTableCode } from "@/domain/tables";
import { orderUrl, originFrom, qrSvg } from "@/server/qr";

export const runtime = "nodejs";

export async function GET(request: Request, ctx: RouteContext<"/print/[table]/qr.png">) {
  const { table } = await ctx.params;
  const code = parseTableCode(table);
  if (!code) return new Response("Unknown table", { status: 404 });
  // Rasterise at the target size (not upscaled) for crisp print.
  const svg = qrSvg(orderUrl(originFrom(request.headers), code), { px: 1600 });
  const png = await sharp(Buffer.from(svg)).resize(1600, 1600, { fit: "contain" }).png().toBuffer();
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="deluj-${code}-qr.png"`,
      "Cache-Control": "no-store",
    },
  });
}
