"use client";

import { chipLabel, passageById } from "@/lib/fixtures";
import type { AnswerData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CitationChip } from "./citation-chip";

interface AnswerProps {
  answer: AnswerData;
  /** Show the question above the answer. Off when the page already shows it. */
  showQuestion?: boolean;
  className?: string;
}

/**
 * An answer: the sentences flow as one paragraph, and every sentence is followed by the
 * citation chip(s) that support it.
 */
export function Answer({ answer, showQuestion = true, className }: AnswerProps) {
  return (
    <article className={cn("sheet px-6 py-6 sm:px-8", className)}>
      {showQuestion && (
        <h3 className="font-heading mb-4 text-lg leading-snug">{answer.question}</h3>
      )}
      <p className="reading">
        {answer.sentences.map((sentence) => (
          <span key={sentence.id}>
            {sentence.text}{" "}
            {sentence.citations.map((id) => {
              const passage = passageById(id);
              if (!passage) return null;
              return (
                <span key={id} className="mr-1 inline-block">
                  <CitationChip passageId={id} label={chipLabel(passage)} />
                </span>
              );
            })}{" "}
          </span>
        ))}
      </p>
    </article>
  );
}
