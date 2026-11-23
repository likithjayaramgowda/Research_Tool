"use client";

import { CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { referenceParts, referenceText, styleInfo } from "@/lib/citation";
import type { CitationStyle, Paper } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ReferenceListProps {
  references: { paper: Paper; number: number }[];
  style: CitationStyle;
}

/**
 * The reference list under an answer. It never invents anything: a missing field shows as a
 * marked gap ("[volume missing]"), and an entry that cannot be formatted says so. "Copy" puts
 * exactly the displayed text on the clipboard, gaps included, because both come from the same
 * `referenceParts` call.
 */
export function ReferenceList({ references, style }: ReferenceListProps) {
  const info = styleInfo(style);
  const hanging = info.kind !== "numbered";

  const copy = async () => {
    const text = references.map((r) => referenceText(r.paper, style, r.number)).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast("TODO(copy): References copied.");
    } catch {
      toast.error("TODO(copy): Could not copy.");
    }
  };

  return (
    <section aria-label={info.listTitle} className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-heading text-base">{info.listTitle}</h4>
        <Button variant="ghost" size="sm" onClick={copy}>
          <CopyIcon aria-hidden />
          Copy {info.listTitle.toLowerCase()}
        </Button>
      </div>
      <ol className="mt-3 flex list-none flex-col gap-3 p-0">
        {references.map(({ paper, number }) => (
          <li
            key={paper.id}
            data-reference=""
            className={cn("font-serif text-sm leading-relaxed", hanging && "pl-6 -indent-6")}
          >
            {referenceParts(paper, style, number).map((part, i) =>
              part.gap ? (
                // A gap is words in brackets on a tinted chip, so it never relies on colour alone.
                <span
                  key={i}
                  data-reference-gap=""
                  className="bg-muted text-ink rounded-sm px-1 font-sans text-xs"
                >
                  {part.text}
                </span>
              ) : part.italic ? (
                <i key={i}>{part.text}</i>
              ) : (
                <span key={i} data-reference-unusable={part.unusable ? "" : undefined}>
                  {part.text}
                </span>
              ),
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
