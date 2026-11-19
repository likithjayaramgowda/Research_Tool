"use client";

import { animate } from "motion";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * "The lens": choosing a citation chip brings its source passage into focus.
 * This file holds the shared state. The visuals live in citation-chip.tsx and source-passage.tsx.
 */

/** Total length of every lens animation, in seconds. The brief caps it at 200 ms. */
export const LENS_DURATION = 0.15;

interface LensValue {
  /** The passage id currently in focus, or null when nothing is. */
  activeId: string | null;
  focus: (passageId: string) => void;
  clear: () => void;
}

const LensContext = createContext<LensValue | null>(null);

export function LensProvider({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const focus = useCallback((id: string) => setActiveId(id), []);
  const clear = useCallback(() => setActiveId(null), []);

  // Escape clears the lens, but only while there is something to clear.
  useEffect(() => {
    if (activeId === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) clear();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeId, clear]);

  const value = useMemo(() => ({ activeId, focus, clear }), [activeId, focus, clear]);
  return <LensContext.Provider value={value}>{children}</LensContext.Provider>;
}

export function useLens(): LensValue {
  const ctx = useContext(LensContext);
  if (!ctx) throw new Error("useLens must be used inside <LensProvider>");
  return ctx;
}

/**
 * Scrolls `target` to the middle of its scrolling `container` using Motion, so the length is
 * ours (under 200 ms) rather than the browser's. Instant when the visitor prefers reduced motion.
 */
export function scrollToCenter(container: HTMLElement, target: HTMLElement, reduced: boolean) {
  const containerBox = container.getBoundingClientRect();
  const targetBox = target.getBoundingClientRect();
  const offset = targetBox.top - containerBox.top - (containerBox.height - targetBox.height) / 2;
  const from = container.scrollTop;
  const to = Math.max(0, from + offset);
  if (reduced || Math.abs(to - from) < 1) {
    container.scrollTop = to;
    return;
  }
  animate(from, to, {
    duration: LENS_DURATION,
    ease: "easeOut",
    onUpdate: (value) => {
      container.scrollTop = value;
    },
  });
}
