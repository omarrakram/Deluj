"use client";

import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";

export function PrintToolbar({ url, tableCode }: { url: string; tableCode: string }) {
  return (
    <div className="no-print mx-auto mb-6 flex max-w-xl flex-wrap items-center justify-center gap-2 px-4">
      <Link href="/owner#settings" className="flex h-11 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold shadow-soft">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <button onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-full bg-orange px-5 text-sm font-bold text-white shadow-orange">
        <Printer className="h-4 w-4" /> Print card
      </button>
      <a href={`/print/${tableCode}/qr.png`} className="flex h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-cream" download>
        <Download className="h-4 w-4" /> QR · PNG
      </a>
      <a href={`/print/${tableCode}/qr.svg`} className="flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold shadow-soft" download>
        <Download className="h-4 w-4" /> QR · SVG
      </a>
      <Link href={url.replace(/^https?:\/\/[^/]+/, "")} className="sr-only">
        Open the table menu
      </Link>
    </div>
  );
}
