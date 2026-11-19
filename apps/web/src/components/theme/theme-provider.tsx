"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

export type Theme = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "litlens-theme";

/**
 * Runs in <head> before the page paints, so a dark-mode visitor never sees a white flash.
 * Kept as a string because it must execute before React does.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark"||((t===null||t==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}`;

interface ThemeContextValue {
  /** What the visitor chose: system (the default), light or dark. */
  theme: Theme;
  /** What is actually showing right now. */
  resolved: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// --- Two tiny "external stores": the saved choice, and the operating system's preference. ---
// useSyncExternalStore is React's tool for reading browser state that lives outside React.

const choiceListeners = new Set<() => void>();
// Used when storage is blocked, so the toggle still works for this visit.
let memoryChoice: Theme | null = null;

function subscribeChoice(onChange: () => void): () => void {
  choiceListeners.add(onChange);
  window.addEventListener("storage", onChange); // another tab changed it
  return () => {
    choiceListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readChoice(): Theme {
  if (memoryChoice) return memoryChoice;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // Storage can be blocked (private mode); fall back to the system setting.
  }
  return "system";
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeSystem(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readSystemDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore<Theme>(subscribeChoice, readChoice, () => "system");
  const systemDark = useSyncExternalStore(subscribeSystem, readSystemDark, () => false);

  const resolved: ResolvedTheme =
    theme === "dark" || (theme === "system" && systemDark) ? "dark" : "light";

  // Keep the <html> class in step with what is showing.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  const setTheme = useCallback((next: Theme) => {
    memoryChoice = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore: the choice just will not persist.
    }
    choiceListeners.forEach((listener) => listener());
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
