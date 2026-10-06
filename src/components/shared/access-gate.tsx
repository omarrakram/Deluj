"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";

/** Shown only when DELUJ_ACCESS_CODE is configured. */
export function AccessGate({ area }: { area: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      if (res.ok) router.refresh();
      else setError("That code didn't work. Try again.");
    } catch {
      setError("We couldn't reach Deluj. Check the connection.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="terrazzo grid min-h-dvh place-items-center bg-stone px-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[2rem] bg-cream p-8 text-center shadow-lift">
        <Wordmark className="mx-auto h-10 text-orange" />
        <p className="mt-6 font-display text-2xl font-extrabold">{area}</p>
        <p className="mt-1 text-ink-soft">Enter the team access code to continue.</p>
        <label className="mt-6 flex h-14 items-center gap-3 rounded-full bg-white px-5 shadow-soft">
          <Lock className="h-5 w-5 text-orange" />
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-full w-full bg-transparent text-lg outline-none"
            aria-label="Access code"
          />
        </label>
        {error && <p className="mt-3 text-sm font-semibold text-alert">{error}</p>}
        <button disabled={busy || !code} className="mt-5 h-14 w-full rounded-full bg-orange font-bold text-white shadow-orange disabled:opacity-60">
          {busy ? "Checking…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
