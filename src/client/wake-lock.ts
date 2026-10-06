"use client";

import { useEffect } from "react";

/** Keep the screen awake (kitchen tablet, owner laptop) where the browser allows it. */
export function useWakeLock(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        if (document.visibilityState !== "visible") return;
        lock = await navigator.wakeLock.request("screen");
        if (cancelled) await lock.release();
      } catch {
        /* denied or unsupported: the screen just follows the device setting */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, [enabled]);
}
