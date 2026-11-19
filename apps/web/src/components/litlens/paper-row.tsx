"use client";

import { CheckIcon, CircleAlertIcon } from "lucide-react";

import { useCitationStyle } from "@/components/citation/citation-style-provider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { shortName } from "@/lib/citation";
import type { Paper, PaperStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PaperRowProps {
  paper: Paper;
  selected?: boolean;
  onSelect?: (paperId: string) => void;
  onRetry?: (paperId: string) => void;
  className?: string;
}

const STATUS_LABEL: Record<PaperStatus, string> = {
  uploading: "Uploading",
  reading: "Reading",
  ready: "Ready",
  failed: "Failed",
};

/** A paper in the library: title, authors, and where it is in the upload-and-read pipeline. */
export function PaperRow({ paper, selected = false, onSelect, onRetry, className }: PaperRowProps) {
  const { style } = useCitationStyle();
  const busy = paper.status === "uploading" || paper.status === "reading";
  return (
    <li
      className={cn(
        "border-rule flex items-start gap-2 border-b py-3 last:border-b-0",
        selected && "bg-accent -mx-3 rounded-md px-3",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSelect?.(paper.id)}
        aria-current={selected ? "true" : undefined}
        className="flex min-w-0 flex-1 flex-col gap-1 rounded-md text-left"
      >
        <span className="font-heading text-sm leading-snug font-semibold">{paper.title}</span>
        <span className="text-graphite text-xs">{shortName(paper, style)}</span>
        <span className="mt-1 flex items-center gap-2 text-xs">
          {paper.status === "ready" && <CheckIcon className="text-graphite size-4" aria-hidden />}
          {paper.status === "failed" && (
            <CircleAlertIcon className="text-alert size-4" aria-hidden />
          )}
          <span
            className={cn(
              "font-semibold",
              paper.status === "failed" ? "text-alert" : "text-foreground",
            )}
          >
            {STATUS_LABEL[paper.status]}
          </span>
          {busy && typeof paper.progress === "number" && (
            <span className="text-graphite">{paper.progress}%</span>
          )}
        </span>
        {busy && (
          <Progress
            value={paper.progress ?? null}
            aria-label={`${STATUS_LABEL[paper.status]} ${paper.title}`}
            className="mt-1 w-full"
          />
        )}
        {paper.status === "failed" && (
          <span className="text-alert text-xs">TODO(copy): This file could not be read.</span>
        )}
      </button>
      {paper.status === "failed" && (
        <Button variant="outline" size="sm" onClick={() => onRetry?.(paper.id)}>
          Retry
        </Button>
      )}
    </li>
  );
}
