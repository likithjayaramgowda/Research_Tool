"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CITATION_STYLES, inTextLabel, isCitationStyle } from "@/lib/citation";
import { papers } from "@/lib/fixtures";
import { useCitationStyle } from "./citation-style-provider";

/**
 * Picks the citation style. Every chip, paper name and reference list in the app re-formats at
 * once. Each choice shows a live example, so the visitor can see what they are choosing.
 */
export function CitationStyleSelect({ className }: { className?: string }) {
  const { style, info, setStyle } = useCitationStyle();
  const example = papers[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" className={className} />}
        aria-label={`Citations: ${info.label}. Change citation style`}
      >
        Citations: {info.label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-80">
        <DropdownMenuRadioGroup
          value={style}
          onValueChange={(value) => {
            if (isCitationStyle(value)) setStyle(value);
          }}
        >
          {CITATION_STYLES.map((s) => (
            <DropdownMenuRadioItem key={s.id} value={s.id} closeOnClick className="py-2">
              <span className="flex flex-col items-start gap-0.5">
                <span className="font-semibold">{s.label}</span>
                <span className="text-graphite text-xs whitespace-nowrap">
                  {inTextLabel(example, 4, s.id, 1)}
                </span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
