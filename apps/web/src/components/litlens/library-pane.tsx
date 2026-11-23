"use client";

import { useId } from "react";

import { papers as samplePapers } from "@/lib/fixtures";
import type { Paper } from "@/lib/types";
import { DemoLoop } from "./demo-loop";
import { EmptyState } from "./empty-state";
import { PaperRow } from "./paper-row";
import { UploadDropzone } from "./upload-dropzone";

interface LibraryPaneProps {
  /** The papers in the workspace. Defaults to the sample data; empty shows the empty state. */
  papers?: Paper[];
  selectedId: string | null;
  onSelect: (paperId: string) => void;
  /**
   * Supplies the pane's one heading, given the id the section is labelled by. The mobile drawer
   * passes its own title here so "Library" is shown once. Defaults to a plain h2.
   */
  renderHeading?: (id: string) => React.ReactNode;
}

/** The left pane: the papers in the workspace, and a place to add more. */
export function LibraryPane({
  papers = samplePapers,
  selectedId,
  onSelect,
  renderHeading,
}: LibraryPaneProps) {
  const headingId = useId();
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        {renderHeading ? (
          renderHeading(headingId)
        ) : (
          <h2 id={headingId} className="text-lg">
            Library
          </h2>
        )}
        {papers.length === 0 ? (
          <div className="sheet flex flex-col gap-4 p-4">
            <DemoLoop variant="compact" />
            <EmptyState
              title="TODO(copy): No papers yet."
              description="TODO(copy): Add a paper below, then ask it a question."
            />
          </div>
        ) : (
          <ul className="sheet px-4 py-1">
            {papers.map((paper) => (
              <PaperRow
                key={paper.id}
                paper={paper}
                selected={paper.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </section>
      <UploadDropzone />
    </div>
  );
}
