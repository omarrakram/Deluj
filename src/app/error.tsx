"use client";

import { useEffect } from "react";
import { BrandMessage } from "@/components/shared/brand-message";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.warn("[deluj] recovered from a page error", error.digest ?? "");
  }, [error]);
  return (
    <BrandMessage eyebrow="One moment" title="Something got stuck in the oven." body="It's not you — give it another try and we'll have it ready.">
      <button onClick={reset} className="mt-8 inline-flex h-14 items-center rounded-full bg-cream px-7 font-bold text-orange-deep shadow-lift">
        Try again
      </button>
    </BrandMessage>
  );
}
