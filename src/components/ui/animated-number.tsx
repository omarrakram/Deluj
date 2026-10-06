"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/** Counts smoothly to a new value; used for live KPIs. */
export function AnimatedNumber({ value, format, duration = 0.9 }: { value: number; format: (n: number) => string; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce || from.current === value) {
      from.current = value;
      setDisplay(value);
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => setDisplay(v),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, duration, reduce]);
  return <span className="tabular">{format(display)}</span>;
}
