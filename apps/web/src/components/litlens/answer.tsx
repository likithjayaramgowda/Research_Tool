"use client";

import { CopyIcon } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import { useCitationStyle } from "@/components/citation/citation-style-provider";
import { Button } from "@/components/ui/button";
import {
  inTextLabel,
  referenceOrder,
  referenceParts,
  referenceText,
  shortName,
  styleInfo,
} from "@/lib/citation";
import { paperById, papers, passageById } from "@/lib/fixtures";
import type { AnswerData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CitationChip } from "./citation-chip";

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
  const info = styleInfo(style);
  const hanging = info.kind !== "numbered";

  const copyReferences = async () => {
    const text = references.map((r) => referenceText(r.paper, style, r.number)).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast("TODO(copy): References copied.");
    } catch {
      toast.error("TODO(copy): Could not copy.");
    }
  };

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
        <section aria-label={info.listTitle} className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-heading text-base">{info.listTitle}</h4>
            <Button variant="ghost" size="sm" onClick={copyReferences}>
              <CopyIcon aria-hidden />
              Copy {info.listTitle.toLowerCase()}
            </Button>
          </div>
          <ol className="mt-3 flex list-none flex-col gap-3 p-0">
            {references.map(({ paper, number }) => (
              <li
                key={paper.id}
                className={cn("font-serif text-sm leading-relaxed", hanging && "pl-6 -indent-6")}
              >
                {referenceParts(paper, style, number).map((part, i) =>
                  part.italic ? <i key={i}>{part.text}</i> : <span key={i}>{part.text}</span>,
                )}
              </li>
            ))}
          </ol>
        </section>
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
