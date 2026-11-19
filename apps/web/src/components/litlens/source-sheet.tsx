"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useId, useMemo, useRef } from "react";

import { useCitationStyle } from "@/components/citation/citation-style-provider";
import { Button } from "@/components/ui/button";
import { shortName } from "@/lib/citation";
import type { Paper, Passage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { scrollToCenter, useLens } from "./lens";
import { SourcePassage } from "./source-passage";

interface SourceSheetProps {
  papers: Paper[];
  passages: Passage[];
  className?: string;
  /** Extra classes for the header row, for example to leave room for a close button. */
  headerClassName?: string;
}

/**
 * The reading surface for sources. Passages are grouped by paper. When the lens focuses a
 * passage, this sheet scrolls it to the middle (the highlight and dimming are in SourcePassage).
 */
export function SourceSheet({ papers, passages, className, headerClassName }: SourceSheetProps) {
  const { activeId, clear } = useLens();
  const reduced = useReducedMotion();
  const scroller = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const { style } = useCitationStyle();

  const groups = useMemo(
    () =>
      papers
        .map((paper) => ({
          paper,
          passages: passages.filter((p) => p.paperId === paper.id).sort((a, b) => a.page - b.page),
        }))
        .filter((g) => g.passages.length > 0),
    [papers, passages],
  );

  useEffect(() => {
    if (activeId === null || !scroller.current) return;
    const target = scroller.current.querySelector<HTMLElement>(`[data-passage-id="${activeId}"]`);
    if (target) scrollToCenter(scroller.current, target, !!reduced);
  }, [activeId, reduced]);

  const activePassage = passages.find((p) => p.id === activeId);

  return (
    <section aria-labelledby={headingId} className={cn("sheet flex min-h-0 flex-col", className)}>
      <div
        className={cn("flex items-center justify-between gap-3 px-6 pt-5 pb-3", headerClassName)}
      >
        <h2 id={headingId} className="text-lg">
          Source
        </h2>
        {activeId !== null && (
          <Button variant="ghost" size="sm" onClick={clear}>
            Clear focus (Esc)
          </Button>
        )}
      </div>
      {/* Announces the change to screen-reader users; sighted users see the highlight. */}
      <p className="sr-only" aria-live="polite">
        {activePassage ? `Source in focus, page ${activePassage.page}: ${activePassage.text}` : ""}
      </p>
      <div
        ref={scroller}
        tabIndex={0}
        role="region"
        aria-label="Source passages"
        className="min-h-0 flex-1 overflow-y-auto px-6 pt-2 pb-8"
      >
        {activeId === null && (
          <p className="text-graphite mb-6 text-sm">
            TODO(copy): Choose a citation to see its source.
          </p>
        )}
        <div className="flex flex-col gap-10">
          {groups.map(({ paper, passages: list }) => (
            <article key={paper.id} className="flex flex-col gap-5">
              <header>
                <h3 className="font-heading text-base leading-snug">{paper.title}</h3>
                <p className="text-graphite mt-1 text-xs">{shortName(paper, style)}</p>
              </header>
              {list.map((passage) => (
                <SourcePassage key={passage.id} passage={passage} paper={paper} />
              ))}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
