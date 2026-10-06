"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, ChefHat, Database, ExternalLink, QrCode, RotateCcw, Smartphone, Wifi, WifiOff } from "lucide-react";
import { setOfflineMode } from "@/client/backend";
import type { LinkStatus } from "@/client/store";
import { Sheet } from "@/components/ui/sheet";
import { LinkDot } from "@/components/ui/link-status";

function HostedMemoryWarning() {
  const [host] = useState(() => (typeof window === "undefined" ? "" : window.location.hostname));
  const local = !host || host === "localhost" || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) || host.endsWith(".local");
  if (local) return null;
  return (
    <p className="mt-4 rounded-2xl bg-amber-soft px-4 py-3 text-sm font-semibold text-amber">
      Supabase isn&apos;t configured on this deployment, so devices only stay in sync while they reach the same server instance. Add the Supabase
      environment variables for a reliable multi-device demo.
    </p>
  );
}

const BACKEND_COPY = {
  supabase: { title: "Supabase Realtime", body: "Shared Postgres database. Every phone, tablet and laptop sees the same live state." },
  memory: { title: "Deluj local server", body: "This server keeps the live state in memory and streams it to every connected device." },
  local: { title: "Offline mode (this device)", body: "No network needed. Screens open in this browser stay in sync with each other." },
} as const;

export function SettingsPanel({
  backend,
  link,
  onReset,
}: {
  backend: keyof typeof BACKEND_COPY | null;
  link: LinkStatus;
  onReset: () => Promise<boolean>;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const b = BACKEND_COPY[backend ?? "memory"];

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Settings</h2>
        <p className="text-sm text-ink-soft">Connections, devices and demo controls.</p>
      </div>

      <section className="rounded-3xl bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-powder-soft text-powder-deep">
              <Database className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-lg font-bold">{b.title}</p>
              <p className="text-sm text-ink-soft">{b.body}</p>
            </div>
          </div>
          <LinkDot status={link} />
        </div>
        {backend === "memory" && <HostedMemoryWarning />}
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-soft">
        <p className="font-display text-lg font-bold">Screens</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            { href: "/order/table-07", label: "Table 07 menu", icon: Smartphone },
            { href: "/staff", label: "Kitchen display", icon: ChefHat },
            { href: "/print/table-07", label: "Table 07 QR card", icon: QrCode },
          ].map((l) => (
            <Link key={l.href} href={l.href} target="_blank" className="flex h-12 items-center justify-between rounded-2xl bg-cream px-4 text-sm font-semibold transition hover:bg-cream-deep">
              <span className="flex items-center gap-2">
                <l.icon className="h-4 w-4 text-orange" /> {l.label}
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-ink-mute" />
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-soft">
        <div className="flex gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-stone">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="font-display text-lg font-bold">Branches</p>
            <p className="text-sm text-ink-soft">Future branch view — each branch gets its own menu, floor and kitchen, rolled up here.</p>
            <ul className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
              <li className="rounded-full bg-orange px-3 py-1.5 text-white">Deluj · this branch</li>
              <li className="rounded-full bg-stone px-3 py-1.5 text-ink-soft">Branch 02 · demo</li>
              <li className="rounded-full bg-stone px-3 py-1.5 text-ink-soft">Branch 03 · demo</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border-2 border-dashed border-line p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-mute">Demo controls</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg font-bold">Reset demo</p>
            <p className="text-sm text-ink-soft">Clears demo orders and requests, restores the menu, Table 07 and the seeded day.</p>
          </div>
          <button onClick={() => setConfirm(true)} className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-cream" data-testid="reset-open">
            <RotateCcw className="h-4 w-4" /> Reset demo…
          </button>
        </div>
        <div className="mt-5 flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg font-bold">Offline mode on this device</p>
            <p className="text-sm text-ink-soft">Backup for a venue without internet: open customer, kitchen and owner in tabs of this browser and they sync locally.</p>
          </div>
          {backend === "local" ? (
            <button
              onClick={() => {
                setOfflineMode(false);
                window.location.reload();
              }}
              className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-powder px-5 text-sm font-bold text-ink"
            >
              <Wifi className="h-4 w-4" /> Back online
            </button>
          ) : (
            <button
              onClick={() => {
                setOfflineMode(true);
                window.location.reload();
              }}
              className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold shadow-soft"
            >
              <WifiOff className="h-4 w-4" /> Use offline mode
            </button>
          )}
        </div>
        <p className="mt-5 text-xs text-ink-mute">
          All dashboard figures are illustrative demo data generated for this demonstration — not Deluj&apos;s actual business performance. Menu items and prices are
          Deluj&apos;s current menu.
        </p>
      </section>

      <Sheet open={confirm} onClose={() => !busy && setConfirm(false)} label="Reset demo">
        <div className="px-6 pb-6 pt-8">
          <p className="font-display text-2xl font-extrabold">Reset the demo?</p>
          <p className="mt-2 text-ink-soft">
            Every screen returns to a fresh demo day: demo orders and requests are cleared, all menu items become available again, and the seeded history is restored.
          </p>
          <div className="safe-bottom mt-6 grid grid-cols-2 gap-3">
            <button disabled={busy} onClick={() => setConfirm(false)} className="h-12 rounded-full bg-white font-semibold shadow-soft">
              Cancel
            </button>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const ok = await onReset();
                setBusy(false);
                if (ok) setConfirm(false);
              }}
              className="h-12 rounded-full bg-orange font-bold text-white shadow-orange"
              data-testid="reset-confirm"
            >
              {busy ? "Resetting…" : "Reset demo"}
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
