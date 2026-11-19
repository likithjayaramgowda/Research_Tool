"use client";

import { answer, papers, passages } from "@/lib/fixtures";
import { cn } from "@/lib/utils";
import { Answer } from "./answer";
import { LensProvider } from "./lens";
import { SourceSheet } from "./source-sheet";

/** A self-contained answer plus source sheet, used to show the lens working. */
export function LensDemo({ className }: { className?: string }) {
  return (
    <LensProvider>
      <div className={cn("grid items-start gap-6 lg:grid-cols-2", className)}>
        <Answer answer={answer} />
        <SourceSheet papers={papers} passages={passages} className="h-[28rem]" />
      </div>
    </LensProvider>
  );
}
