"use client";

import { useCitationStyle } from "@/components/citation/citation-style-provider";
import { shortName } from "@/lib/citation";
import type { Paper, PaperCardData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";

interface PaperCardProps {
  paper: Paper;
  className?: string;
}

const FIELDS: { key: keyof PaperCardData; label: string }[] = [
  { key: "question", label: "Question" },
  { key: "method", label: "Method" },
  { key: "data", label: "Data" },
  { key: "findings", label: "Findings" },
  { key: "limitations", label: "Limitations" },
];

/** One paper boiled down to five fields. Shows a placeholder until the paper is ready. */
export function PaperCard({ paper, className }: PaperCardProps) {
  const { style } = useCitationStyle();
  return (
    <article className={cn("sheet px-6 py-6 sm:px-8", className)}>
      <h3 className="font-heading text-lg leading-snug">{paper.title}</h3>
      <p className="text-graphite mt-1 text-sm">{shortName(paper, style)}</p>
      {paper.card ? (
        <dl className="mt-6 flex flex-col gap-6">
          {FIELDS.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1">
              <dt className="text-graphite text-sm font-semibold">{label}</dt>
              <dd className="reading m-0">{paper.card?.[key]}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <EmptyState
          className="mt-6"
          title="TODO(copy): No paper card yet."
          description="TODO(copy): The card appears once the paper has been read."
        />
      )}
    </article>
  );
}
