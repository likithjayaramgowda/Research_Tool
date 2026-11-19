"use client";

import { motion, useReducedMotion } from "motion/react";

import type { Paper, Passage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LENS_DURATION, useLens } from "./lens";

export type LensState = "idle" | "focused" | "dimmed";

interface SourcePassageProps {
  passage: Passage;
  paper?: Paper;
  /** Forces a state. Normally the state comes from the lens; the /design page uses this. */
  state?: LensState;
  className?: string;
}

// Colours are CSS variables, so the same animation works in light and dark mode.
const HIGHLIGHT_OFF = "rgba(255, 225, 77, 0)";
const HIGHLIGHT_ON = "var(--highlighter)";

/**
 * A quoted passage from a paper. When it is the focused one it gets the yellow highlight;
 * when another passage is focused it dims (ink text at 65% opacity still clears 4.5:1).
 */
export function SourcePassage({ passage, paper, state, className }: SourcePassageProps) {
  const { activeId } = useLens();
  const reduced = useReducedMotion();
  const lensState: LensState =
    state ?? (activeId === null ? "idle" : activeId === passage.id ? "focused" : "dimmed");

  const transition = { duration: reduced ? 0 : LENS_DURATION, ease: "easeOut" as const };

  return (
    <figure
      data-passage-id={passage.id}
      data-lens-state={lensState}
      className={cn("m-0", className)}
    >
      <motion.blockquote
        className="reading m-0"
        initial={false}
        animate={{ opacity: lensState === "dimmed" ? 0.65 : 1 }}
        transition={transition}
      >
        <motion.mark
          className="-mx-1 rounded-sm bg-transparent box-decoration-clone px-1 py-0.5"
          initial={false}
          animate={{
            backgroundColor: lensState === "focused" ? HIGHLIGHT_ON : HIGHLIGHT_OFF,
            color: lensState === "focused" ? "var(--on-highlighter)" : "var(--ink)",
          }}
          transition={transition}
        >
          {passage.text}
        </motion.mark>
      </motion.blockquote>
      <figcaption className="text-graphite mt-2 font-sans text-xs">
        {paper ? `${paper.short}, ` : ""}page {passage.page}
      </figcaption>
    </figure>
  );
}
