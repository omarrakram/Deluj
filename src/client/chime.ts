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

export function useChime() {
  const [enabled, setEnabled] = useState(false);
  const ctx = useRef<AudioContext | null>(null);

  useEffect(() => {
    let wanted = false;
    try {
      wanted = localStorage.getItem(PREF) === "on";
    } catch {
      /* ignore */
    }
    if (!wanted) return;
    // Remembered preference: arm on the first tap anywhere.
    const arm = () => {
      try {
        ctx.current ??= new AudioContext();
        void ctx.current.resume();
        setEnabled(true);
      } catch {
        /* no audio support */
      }
    };
    window.addEventListener("pointerdown", arm, { once: true });
    return () => window.removeEventListener("pointerdown", arm);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((on) => {
      const next = !on;
      try {
        localStorage.setItem(PREF, next ? "on" : "off");
        if (next) {
          ctx.current ??= new AudioContext();
          void ctx.current.resume();
          playTones(ctx.current, "request");
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const play = useCallback(
    (kind: Kind) => {
      if (!enabled || !ctx.current) return;
      try {
        playTones(ctx.current, kind);
      } catch {
        /* ignore */
      }
    },
    [enabled],
  );

  return { enabled, toggle, play };
}
