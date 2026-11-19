"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

import { DEFAULT_CITATION_STYLE, isCitationStyle, styleInfo, type StyleInfo } from "@/lib/citation";
import type { CitationStyle } from "@/lib/types";

export const CITATION_STYLE_STORAGE_KEY = "litlens-citation-style";

interface CitationStyleValue {
  style: CitationStyle;
  info: StyleInfo;
  setStyle: (style: CitationStyle) => void;
}

const Context = createContext<CitationStyleValue | null>(null);

// The chosen style is remembered in the browser. Same pattern as the theme provider: a tiny
// external store read through useSyncExternalStore, with a memory fallback if storage is blocked.
const listeners = new Set<() => void>();
let memoryChoice: CitationStyle | null = null;

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readStyle(): CitationStyle {
  if (memoryChoice) return memoryChoice;
  try {
    const stored = localStorage.getItem(CITATION_STYLE_STORAGE_KEY);
    if (isCitationStyle(stored)) return stored;
  } catch {
    // Storage blocked: use the default.
  }
  return DEFAULT_CITATION_STYLE;
}

export function CitationStyleProvider({ children }: { children: React.ReactNode }) {
  const style = useSyncExternalStore<CitationStyle>(
    subscribe,
    readStyle,
    () => DEFAULT_CITATION_STYLE,
  );

  const setStyle = useCallback((next: CitationStyle) => {
    memoryChoice = next;
    try {
      localStorage.setItem(CITATION_STYLE_STORAGE_KEY, next);
    } catch {
      // The choice simply will not persist.
    }
    listeners.forEach((listener) => listener());
  }, []);

  const value = useMemo(() => ({ style, info: styleInfo(style), setStyle }), [style, setStyle]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCitationStyle(): CitationStyleValue {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useCitationStyle must be used inside <CitationStyleProvider>");
  return ctx;
}
