"use client";

import { useEffect, useRef } from "react";

import { CitationStyleSelect } from "@/components/citation/citation-style-select";
import { heroAnswer, papers, passages } from "@/lib/fixtures";
import { Answer } from "./answer";
import { LensProvider, useLens } from "./lens";
import { SourceSheet } from "./source-sheet";

/** How long the example waits after load before it plays, in milliseconds. */
const PLAY_AFTER_MS = 900;

/**
 * The landing page's small working example of the lens. It plays once, shortly after load (the
 * first citation brings its passage into focus), then waits for the visitor. If the visitor
 * chooses a chip first, it does not play.
 */
export function HeroLens() {
  return (
    <LensProvider>
      <HeroLensInner />
    </LensProvider>
  );
}

function HeroLensInner() {
  const { activeId, focus } = useLens();
  const latest = useRef(activeId);
  useEffect(() => {
    latest.current = activeId;
  }, [activeId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (latest.current === null) focus("s1");
    }, PLAY_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [focus]);

  const heroPapers = papers.filter((p) => p.id === "p1");
  const heroPassages = passages.filter((p) => p.id === "s1" || p.id === "s2");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-graphite text-sm">Choose a citation to see its source.</p>
        <CitationStyleSelect />
      </div>
      <Answer answer={heroAnswer} showReferences={false} />
      <SourceSheet papers={heroPapers} passages={heroPassages} className="h-[22rem]" />
    </div>
  );
}
