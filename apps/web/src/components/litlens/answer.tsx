"use client";

import { useMemo } from "react";

import { useCitationStyle } from "@/components/citation/citation-style-provider";
import { inTextLabel, referenceOrder, shortName, styleInfo } from "@/lib/citation";
import { paperById, papers, passageById } from "@/lib/fixtures";
import type { AnswerData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CitationChip } from "./citation-chip";
import { ReferenceList } from "./reference-list";

interface AnswerProps {
  answer: AnswerData;
  /** Show the question above the answer. Off when the page already shows it. */
  showQuestion?: boolean;
  /** Show the formatted reference list under the answer. */
  showReferences?: boolean;
  className?: string;
}

/**
 * An answer: the sentences flow as one paragraph, and every sentence is followed by the
 * citation chip(s) that support it. Chip text and the reference list follow the chosen
 * citation style, and re-format the moment the style changes.
 */
export function Answer({
  answer,
  showQuestion = true,
  showReferences = true,
  className,
}: AnswerProps) {
  const { style } = useCitationStyle();
  const references = useMemo(
    () => referenceOrder(answer, (id) => passageById(id)?.paperId, papers, style),
    [answer, style],
  );
  const numberOf = (paperId: string) => references.find((r) => r.paper.id === paperId)?.number ?? 0;
  return (
    <article className={cn("sheet px-6 py-6 sm:px-8", className)}>
      {showQuestion && (
        <h3 className="font-heading mb-4 text-lg leading-snug">{answer.question}</h3>
      )}
      <p className="reading">
        {answer.sentences.map((sentence) => {
          const chips = sentence.citations.flatMap((id) => {
            const passage = passageById(id);
            const paper = passage && paperById(passage.paperId);
            if (!passage || !paper) return [];
            const label = inTextLabel(paper, passage.page, style, numberOf(paper.id));
            // The name must contain the visible text (WCAG 2.5.3). Numbered styles show only
            // "[1, p. 4]", which means nothing when read aloud, so they add the paper too.
            const accessibleName =
              styleInfo(style).kind === "numbered"
                ? `Source: ${label}, ${shortName(paper, style)}`
                : `Source: ${label}`;
            return [
              <CitationChip
                key={id}
                passageId={id}
                sentenceId={sentence.id}
                label={label}
                accessibleName={accessibleName}
              />,
            ];
          });
          return (
            <AnswerSentence key={sentence.id} id={sentence.id} text={sentence.text} chips={chips} />
          );
        })}
      </p>

      {showReferences && references.length > 0 && (
        <ReferenceList references={references} style={style} />
      )}
    </article>
  );
}

interface AnswerSentenceProps {
  id: string;
  text: string;
  /** The sentence's citation chips, in order. */
  chips: React.ReactElement[];
}

/**
 * One answer sentence and its chips. The last word travels with the first chip as a
 * non-breaking group, so a chip can never start a line and read as if it introduced the next
 * sentence. Shared by `Answer` and the demo loop, so the two cannot drift apart.
 */
export function AnswerSentence({ id, text, chips }: AnswerSentenceProps) {
  const cut = text.lastIndexOf(" ") + 1;
  return (
    <span data-sentence-id={id} className="sentence">
      {text.slice(0, cut)}
      <span className="whitespace-nowrap">
        {text.slice(cut)}
        {chips.length > 0 && <> {chips[0]}</>}
      </span>
      {chips.slice(1).map((chip) => (
        <span key={chip.key}> {chip}</span>
      ))}{" "}
    </span>
  );
}
