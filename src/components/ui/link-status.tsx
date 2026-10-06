"use client";

import type { LinkStatus } from "@/client/store";

const COPY: Record<LinkStatus, { label: string; dot: string }> = {
  connecting: { label: "Connecting", dot: "bg-amber" },
  live: { label: "Live", dot: "bg-mint" },
  reconnecting: { label: "Reconnecting", dot: "bg-amber" },
  offline: { label: "Offline", dot: "bg-alert" },
  local: { label: "Offline mode", dot: "bg-powder-deep" },
};

export function LinkDot({ status, className = "", dark = false }: { status: LinkStatus; className?: string; dark?: boolean }) {
  const c = COPY[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${dark ? "text-cream/80" : "text-ink-soft"} ${className}`} title={c.label}>
      <span className="relative flex h-2.5 w-2.5">
        {status === "live" && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${c.dot} opacity-50`} />}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${c.dot} ${status === "reconnecting" || status === "connecting" ? "animate-blink" : ""}`} />
      </span>
      {c.label}
    </span>
  );
}
