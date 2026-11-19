"use client";

import { useCitationStyle } from "@/components/citation/citation-style-provider";
import { shortName } from "@/lib/citation";
import { paperById } from "@/lib/fixtures";
import type { ComparisonRow } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ComparisonTableProps {
  rows: ComparisonRow[];
  className?: string;
}

const COLUMNS = ["Paper", "Design", "Sample", "Duration", "Main finding"];

/** Papers side by side: the same few facts for each. Rows are separated by rules, not boxes. */
export function ComparisonTable({ rows, className }: ComparisonTableProps) {
  const { style } = useCitationStyle();
  return (
    <div
      role="region"
      aria-label="Comparison of papers"
      tabIndex={0}
      className={cn("sheet overflow-x-auto px-6 py-4", className)}
    >
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead>
          <tr className="border-rule border-b">
            {COLUMNS.map((c) => (
              <th key={c} scope="col" className="text-graphite py-3 pr-4 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const paper = paperById(row.paperId);
            return (
              <tr key={row.paperId} className="border-rule border-b align-top last:border-b-0">
                <th scope="row" className="font-heading py-4 pr-4 font-semibold">
                  {paper ? shortName(paper, style) : row.paperId}
                </th>
                <td className="py-4 pr-4">{row.design}</td>
                <td className="py-4 pr-4">{row.sample}</td>
                <td className="py-4 pr-4">{row.duration}</td>
                <td className="py-4 pr-2 font-serif text-base">{row.finding}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
