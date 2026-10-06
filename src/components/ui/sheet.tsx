"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Bottom sheet on phones, centred dialog on larger screens. */
export function Sheet({
  open,
  onClose,
  children,
  label,
  tall = false,
  hideClose = false,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
  tall?: boolean;
  hideClose?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => panel.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
          <motion.div
            className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            className={`relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] bg-cream shadow-lift outline-none sm:rounded-[1.75rem] ${tall ? "h-[92dvh] sm:h-[86dvh]" : "max-h-[92dvh] sm:max-h-[86dvh]"}`}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
          >
            <div className="pointer-events-none absolute left-1/2 top-2 z-20 h-1.5 w-10 -translate-x-1/2 rounded-full bg-ink/15 sm:hidden" />
            {!hideClose && (
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-ink shadow-soft transition active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
