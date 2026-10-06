"use client";

// Kitchen chime synthesised with Web Audio (no audio files to load). Muted by
// default; browsers only allow sound after a tap, so enabling it is a gesture.

import { useCallback, useEffect, useRef, useState } from "react";

const PREF = "deluj:chime";

type Kind = "order" | "request";

function playTones(ctx: AudioContext, kind: Kind) {
  const notes = kind === "order" ? [659.25, 880, 1318.5] : [987.77, 783.99];
  const start = ctx.currentTime + 0.02;
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = start + i * 0.13;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.6);
  });
}

function readPref(): boolean {
  try {
    return localStorage.getItem(PREF) === "on";
  } catch {
    return false;
  }
}

function writePref(on: boolean) {
  try {
    localStorage.setItem(PREF, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

export function useChime() {
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(false);
  const ctx = useRef<AudioContext | null>(null);

  /** Create or wake the audio context (iOS suspends it after sleep or backgrounding). */
  const audio = useCallback((): AudioContext | null => {
    try {
      ctx.current ??= new AudioContext();
      if (ctx.current.state !== "running") void ctx.current.resume();
      return ctx.current;
    } catch {
      return null;
    }
  }, []);

  const apply = useCallback((on: boolean) => {
    enabledRef.current = on;
    setEnabled(on);
  }, []);

  useEffect(() => {
    if (!readPref()) return;
    // Remembered preference: browsers need a tap before sound, so arm on the first
    // tap anywhere — except on the chime button itself, which handles its own tap.
    const arm = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest?.('[data-testid="chime-toggle"]')) return;
      window.removeEventListener("pointerdown", arm);
      if (readPref() && audio()) apply(true);
    };
    window.addEventListener("pointerdown", arm);
    return () => window.removeEventListener("pointerdown", arm);
  }, [audio, apply]);

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    writePref(next);
    if (next) {
      const c = audio();
      if (c) playTones(c, "request");
    }
    apply(next);
  }, [audio, apply]);

  const play = useCallback(
    (kind: Kind) => {
      if (!enabledRef.current) return;
      const c = audio();
      if (!c) return;
      try {
        playTones(c, kind);
      } catch {
        /* ignore */
      }
    },
    [audio],
  );

  return { enabled, toggle, play };
}
