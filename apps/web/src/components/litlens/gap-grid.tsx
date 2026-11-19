"use client";

import { CheckIcon, MinusIcon, XIcon } from "lucide-react";

import { useCitationStyle } from "@/components/citation/citation-style-provider";
import { shortName } from "@/lib/citation";
import { paperById } from "@/lib/fixtures";
import type { GapCheckData, GapStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface GapGridProps {
  data: GapCheckData;
  className?: string;
}

const STATUS: Record<GapStatus, { label: string; Icon: typeof CheckIcon }> = {
  studied: { label: "Studied", Icon: CheckIcon },
  partly: { label: "Partly", Icon: MinusIcon },
  "not-studied": { label: "Not studied", Icon: XIcon },
};

/**
 * Gap Check: the student's idea, broken into parts, against each paper. A part that no paper
 * studies is a gap. Status is always icon plus words, never colour alone, and yellow is not used
 * (yellow only ever means evidence).
 */
export function GapGrid({ data, className }: GapGridProps) {
  const { style } = useCitationStyle();
  return (
    <div
      role="region"
      aria-label="Gap Check"
      tabIndex={0}
      className={cn("sheet overflow-x-auto px-6 py-5", className)}
    >
      <p className="font-heading text-base leading-snug">{data.idea}</p>
      <table className="mt-4 w-full min-w-[34rem] text-left text-sm">
        <caption className="sr-only">Gap Check: which papers study each part of your idea</caption>
        <thead>
          <tr className="border-rule border-b">
            <th scope="col" className="text-graphite py-3 pr-4 font-semibold">
              Part of your idea
            </th>
            {data.paperIds.map((id) => {
              const paper = paperById(id);
              return (
                <th key={id} scope="col" className="text-graphite py-3 pr-4 font-semibold">
                  {paper ? shortName(paper, style) : id}
                </th>
              );
            })}
            <th scope="col" className="text-graphite py-3 font-semibold">
              Result
            </th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => {
            const statuses = data.paperIds.map((id) => row.cells[id]);
            const result = statuses.includes("studied")
              ? "Covered"
              : statuses.includes("partly")
                ? "Partly covered"
                : "Gap";
            const isGap = result === "Gap";
            return (
              <tr key={row.aspect} className="border-rule border-b last:border-b-0">
                <th scope="row" className="py-3 pr-4 font-normal">
                  {row.aspect}
                </th>
                {data.paperIds.map((id) => {
                  const { label, Icon } = STATUS[row.cells[id]];
                  return (
                    <td key={id} className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon className="text-graphite size-4" aria-hidden />
                        {label}
                      </span>
                    </td>
                  );
                })}
                <td className={cn("py-3", isGap && "font-semibold")}>{result}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
