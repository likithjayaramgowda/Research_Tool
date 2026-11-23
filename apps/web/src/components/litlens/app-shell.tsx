"use client";

import Link from "next/link";
import { useState } from "react";

import { CitationStyleSelect } from "@/components/citation/citation-style-select";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { papers, passages } from "@/lib/fixtures";
import { ConversationPane } from "./conversation-pane";
import { LensProvider } from "./lens";
import { LibraryPane } from "./library-pane";
import { SourceSheet } from "./source-sheet";

/**
 * The reading desk: Library on the left, Conversation in the middle, Source sheet on the right.
 * Below 1024px the library becomes a drawer and the source becomes a bottom sheet, which opens
 * by itself when a citation is chosen.
 */
export function AppShell() {
  const [selectedPaper, setSelectedPaper] = useState<string | null>("p1");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);

  // A click on any citation chip (mouse, or Enter on the keyboard) opens the source sheet when
  // the desk is too narrow to show it beside the conversation.
  const openSourceOnNarrow = (event: React.MouseEvent) => {
    if (!(event.target as HTMLElement).closest("[data-citation-chip]")) return;
    if (!window.matchMedia("(min-width: 1024px)").matches) setSourceOpen(true);
  };

  return (
    <LensProvider>
      <div className="flex h-dvh flex-col">
        <header className="border-rule flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3">
          <div className="flex items-baseline gap-3">
            <Link href="/" className="font-heading rounded-md text-lg font-semibold">
              LitLens
            </Link>
            <span className="text-graphite text-xs">Sample data</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setLibraryOpen(true)}
            >
              Library
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setSourceOpen(true)}
            >
              Source
            </Button>
            <CitationStyleSelect />
            <ThemeToggle />
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[18rem_minmax(0,1fr)_24rem] xl:grid-cols-[20rem_minmax(0,1fr)_28rem]">
          <aside aria-label="Library" className="hidden min-h-0 overflow-y-auto p-4 lg:block">
            <LibraryPane selectedId={selectedPaper} onSelect={setSelectedPaper} />
          </aside>

          <main
            id="conversation"
            onClick={openSourceOnNarrow}
            className="min-h-0 overflow-y-auto px-4 py-4 lg:px-6"
          >
            <ConversationPane />
          </main>

          <aside aria-label="Source" className="hidden min-h-0 p-4 lg:flex lg:flex-col">
            <SourceSheet papers={papers} passages={passages} className="h-full" />
          </aside>
        </div>
      </div>

      {/* Narrow screens: the library as a drawer... */}
      <Sheet open={libraryOpen} onOpenChange={setLibraryOpen}>
        <SheetContent side="left" className="w-[min(22rem,90vw)] overflow-y-auto p-4">
          {/* One visible "Library" heading: the drawer's own title, which labels the drawer. */}
          <LibraryPane
            selectedId={selectedPaper}
            onSelect={(id) => {
              setSelectedPaper(id);
              setLibraryOpen(false);
            }}
            renderHeading={(id) => (
              <SheetTitle id={id} className="text-lg">
                Library
              </SheetTitle>
            )}
          />
          <SheetDescription className="sr-only">Your papers and the upload area</SheetDescription>
        </SheetContent>
      </Sheet>

      {/* ...and the source as a bottom sheet. */}
      <Sheet open={sourceOpen} onOpenChange={setSourceOpen}>
        <SheetContent side="bottom" className="h-[75dvh] gap-0 p-0" showCloseButton>
          <SheetHeader className="sr-only">
            <SheetTitle>Source</SheetTitle>
            <SheetDescription>The passage your citation points to</SheetDescription>
          </SheetHeader>
          <SourceSheet
            papers={papers}
            passages={passages}
            headerClassName="pr-14"
            className="h-full rounded-none"
          />
        </SheetContent>
      </Sheet>
    </LensProvider>
  );
}
