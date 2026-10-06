import type { Metadata } from "next";
import { headers } from "next/headers";
import { BrandMessage } from "@/components/shared/brand-message";
import { PrintToolbar } from "@/components/shared/print-toolbar";
import { CroissantDoodle, Star, Wave, Wordmark } from "@/components/brand/logo";
import { parseTableCode, tableNumber } from "@/domain/tables";
import { orderUrl, originFrom, qrSvg } from "@/server/qr";

export const metadata: Metadata = { title: "Table QR card" };

export default async function PrintPage(props: PageProps<"/print/[table]">) {
  const { table } = await props.params;
  const code = parseTableCode(table);
  if (!code) {
    return <BrandMessage eyebrow="Hmm" title="No such table." body="Deluj tables run from 01 to 14." action={{ href: "/print/table-07", label: "Table 07 card" }} />;
  }
  const url = orderUrl(originFrom(await headers()), code);
  const svg = qrSvg(url);
  return (
    <main className="terrazzo min-h-dvh bg-stone py-8 print:bg-white print:py-0">
      <style>{`@page { size: A6 portrait; margin: 0; } @media print { .no-print { display: none !important; } .card { box-shadow: none !important; border-radius: 0 !important; width: 105mm !important; height: 148mm !important; } }`}</style>
      <PrintToolbar url={url} tableCode={code} />
      <div
        className="card relative mx-auto flex flex-col items-center overflow-hidden rounded-[1.6rem] bg-orange text-cream shadow-lift"
        style={{ width: "105mm", height: "148mm", maxWidth: "calc(100vw - 2rem)" }}
      >
        <CroissantDoodle className="absolute -left-7 top-[18%] w-28 -rotate-12 text-cream/15" />
        <CroissantDoodle className="absolute -right-8 top-[46%] w-32 rotate-[18deg] text-cream/15" />
        <Star className="absolute right-7 top-8 h-3.5 w-3.5 text-powder" />
        <Star className="absolute left-8 bottom-24 h-3 w-3 text-powder" />

        <div className="relative mt-[9mm] flex flex-col items-center">
          <Wordmark className="h-[13mm] text-powder" />
          <p className="mt-[2mm] font-serif text-[4.2mm] italic text-cream/90">Your Coffee&apos;s Best Friend</p>
        </div>

        <div className="relative mt-[6mm] rounded-[5mm] bg-cream p-[3mm] shadow-lift">
          <div className="h-[46mm] w-[46mm]" dangerouslySetInnerHTML={{ __html: svg }} aria-label={`QR code for ${url}`} role="img" />
        </div>

        <p className="relative mt-[6mm] font-display text-[5mm] font-bold uppercase tracking-[0.35em] text-cream/85">Table</p>
        <p className="relative -mt-[1mm] font-display text-[19mm] font-extrabold leading-none tracking-tight" data-testid="table-number">
          {tableNumber(code)}
        </p>

        <div className="absolute inset-x-0 bottom-0">
          <Wave className="block h-[4mm] w-full text-powder" flip />
          <div className="bg-powder px-[6mm] pb-[5mm] pt-[2mm] text-center text-ink">
            <p className="font-display text-[5.6mm] font-extrabold uppercase tracking-[0.08em]">Scan to order</p>
            <p className="text-[3.2mm] font-medium leading-tight text-ink/75">Order, pay &amp; call the team — right from your table.</p>
          </div>
        </div>
      </div>
      <p className="no-print mx-auto mt-4 max-w-md px-4 text-center text-xs text-ink-mute">
        A6 card · prints edge-to-edge · opens <span className="font-semibold text-ink-soft">{url}</span>
      </p>
    </main>
  );
}
