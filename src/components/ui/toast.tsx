"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, Info } from "lucide-react";

type Tone = "success" | "error" | "info";
interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: Tone;
}

const Ctx = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function ToastProvider({ children, position = "top" }: { children: ReactNode; position?: "top" | "bottom" }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), t.tone === "error" ? 5200 : 3200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        className={`pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4 ${position === "top" ? "top-3" : "bottom-24"}`}
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: position === "top" ? -16 : 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl px-4 py-3 shadow-lift ${
                t.tone === "error" ? "bg-ink text-cream" : t.tone === "success" ? "bg-white text-ink" : "bg-white text-ink"
              }`}
            >
              {t.tone === "success" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-mint" />
              ) : t.tone === "error" ? (
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-orange" />
              ) : (
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-powder-deep" />
              )}
              <div className="min-w-0">
                <p className="font-semibold leading-snug">{t.title}</p>
                {t.body && <p className={`text-sm leading-snug ${t.tone === "error" ? "text-cream/75" : "text-ink-soft"}`}>{t.body}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
