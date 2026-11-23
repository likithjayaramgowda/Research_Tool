"use client";

import { cn } from "@/lib/utils";
import { useLens } from "./lens";

interface CitationChipProps {
  /** The passage this chip points at. */
  passageId: string;
  /** What the chip says, for example "Calloway 2023, p. 4". */
  label: string;
  /** The chip's accessible name, for example "Source: Calloway et al., 2023, page 4". */
  accessibleName: string;
  /** The answer sentence this chip supports. Slice 2.3's real citation mapping hangs off this. */
  sentenceId?: string;
  /** Forces the chosen look. Normally it comes from the lens; the demo loop uses this. */
  pressed?: boolean;
  className?: string;
}

/**
 * The only pill in LitLens, and one of only two places yellow appears (the other is the
 * highlighted passage). It is a real button: Tab reaches it, Enter or Space chooses it.
 */
export function CitationChip({
  passageId,
  label,
  accessibleName,
  sentenceId,
  pressed,
  className,
}: CitationChipProps) {
  const { activeId, focus } = useLens();
  const active = pressed ?? activeId === passageId;
  return (
    <button
      type="button"
      data-citation-chip=""
      data-cites={sentenceId}
      aria-pressed={active}
      aria-label={accessibleName}
      onClick={() => focus(passageId)}
      className={cn(
        "bg-highlighter text-on-highlighter inline-flex min-h-6 items-center rounded-full px-2.5 align-baseline font-sans text-xs font-semibold whitespace-nowrap",
        "ring-ink/30 hover:ring-ink/70 ring-1 transition-shadow ring-inset",
        "aria-pressed:ring-ink aria-pressed:ring-2",
        className,
      )}
    >
      {label}
    </button>
  );
}
