"use client";

import { papers } from "@/lib/fixtures";
import { PaperRow } from "./paper-row";
import { UploadDropzone } from "./upload-dropzone";

interface LibraryPaneProps {
  selectedId: string | null;
  onSelect: (paperId: string) => void;
}

/** The left pane: the papers in the workspace, and a place to add more. */
export function LibraryPane({ selectedId, onSelect }: LibraryPaneProps) {
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="library-heading" className="flex flex-col gap-3">
        <h2 id="library-heading" className="text-lg">
          Library
        </h2>
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
      </section>
      <UploadDropzone />
    </div>
  );
}
