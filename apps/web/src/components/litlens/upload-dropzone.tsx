"use client";

import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UploadDropzoneProps {
  /** Called with the chosen PDFs. This slice is UI only, so the default does nothing. */
  onFiles?: (files: File[]) => void;
  /** Shows an error message in the alert colour. */
  error?: string;
  disabled?: boolean;
  className?: string;
}

/** Drag PDFs onto it, or press the button. UI only: nothing is uploaded yet. */
export function UploadDropzone({
  onFiles,
  error,
  disabled = false,
  className,
}: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();

  const handle = (list: FileList | null) => {
    if (!list || disabled) return;
    onFiles?.(Array.from(list).filter((f) => f.type === "application/pdf"));
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handle(e.dataTransfer.files);
      }}
      className={cn(
        "border-input flex flex-col items-start gap-3 rounded-lg border-2 border-dashed p-5 transition-colors",
        dragging && "border-ink bg-accent border-solid",
        error && "border-alert",
        disabled && "border-rule",
        className,
      )}
    >
      <p className="font-heading text-base font-semibold">Drop PDF files here</p>
      <p id={hintId} className="text-graphite text-sm">
        Up to 30 papers, 50 MB each.
      </p>
      <input
        ref={input}
        type="file"
        accept="application/pdf"
        multiple
        hidden
        disabled={disabled}
        aria-describedby={hintId}
        onChange={(e) => {
          handle(e.target.files);
          e.target.value = "";
        }}
      />
      <Button variant="outline" disabled={disabled} onClick={() => input.current?.click()}>
        Choose files
      </Button>
      {error && (
        <p role="alert" className="text-alert text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
