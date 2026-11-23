"use client";

import { toast } from "sonner";

import { LensDemo } from "@/components/litlens/lens-demo";
import { CitationChip } from "@/components/litlens/citation-chip";
import { DemoLoop } from "@/components/litlens/demo-loop";
import { EmptyState } from "@/components/litlens/empty-state";
import { ReferenceList } from "@/components/litlens/reference-list";
import { LibraryPane } from "@/components/litlens/library-pane";
import { LensProvider } from "@/components/litlens/lens";
import { PaperCard } from "@/components/litlens/paper-card";
import { PaperRow } from "@/components/litlens/paper-row";
import { SourcePassage } from "@/components/litlens/source-passage";
import { UploadDropzone } from "@/components/litlens/upload-dropzone";
import { CitationStyleSelect } from "@/components/citation/citation-style-select";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CITATION_STYLES, inTextLabel, referenceParts, styleInfo } from "@/lib/citation";
import { papers, passages } from "@/lib/fixtures";

const COLOURS = [
  {
    name: "Desk",
    role: "App background",
    light: "#E9EDF0",
    dark: "#0E1524",
    token: "--desk",
  },
  {
    name: "Sheet",
    role: "Reading surfaces: answers, passages, paper cards",
    light: "#FFFFFF",
    dark: "#17223A",
    token: "--sheet",
  },
  {
    name: "Ink",
    role: "Text, primary buttons, focus rings",
    light: "#18233A",
    dark: "#E9EDF0",
    token: "--ink",
  },
  {
    name: "Graphite",
    role: "Secondary text, borders, icons",
    light: "#5B6675",
    dark: "#A3AEBD",
    token: "--graphite",
  },
  {
    name: "Highlighter",
    role: "Citations and highlighted passages only. Nothing else is ever yellow.",
    light: "#FFE14D",
    dark: "#FFE14D",
    token: "--highlighter",
  },
  {
    name: "Alert",
    role: "Errors only",
    light: "#B42318",
    dark: "#FF8A80",
    token: "--alert",
  },
];

/** Measured with the WCAG relative-luminance formula. AA needs 4.5 for text, 3 for large text and UI. */
const CONTRAST = [
  { pair: "Ink on desk", light: "13.31", dark: "15.49" },
  { pair: "Ink on sheet", light: "15.67", dark: "13.45" },
  { pair: "Graphite on desk", light: "4.95", dark: "8.12" },
  { pair: "Graphite on sheet", light: "5.83", dark: "7.05" },
  { pair: "Ink on highlighter", light: "12.03", dark: "12.03" },
  { pair: "Alert on sheet", light: "6.57", dark: "6.94" },
  { pair: "Dimmed ink (65%) on sheet", light: "4.97", dark: "6.47" },
];

const SCALE = [
  { px: 13, cls: "text-xs", use: "Metadata, chips" },
  { px: 15, cls: "text-sm", use: "Interface base" },
  { px: 17, cls: "text-base", use: "Reading text" },
  { px: 21, cls: "text-lg", use: "Small headings" },
  { px: 26, cls: "text-xl", use: "Section headings" },
  { px: 33, cls: "text-2xl", use: "Page headings" },
  { px: 41, cls: "text-3xl", use: "Display" },
  { px: 52, cls: "text-4xl", use: "Hero" },
];

function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 id={id} className="text-xl">
          {title}
        </h2>
        {intro && <p className="text-graphite max-w-prose">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

function Specimen({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-sans text-sm font-semibold">{label}</h3>
      {children}
    </div>
  );
}

export default function DesignPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-20 px-4 py-10 sm:px-8 sm:py-16">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <p className="font-heading text-lg font-semibold">LitLens</p>
          <h1 className="text-3xl sm:text-4xl">Design system</h1>
          <p className="text-graphite max-w-prose text-base">
            A light table for papers: white sheets on a cool desk, ink-coloured text, and one
            highlighter yellow that only ever means evidence. Use the toggle for dark mode.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CitationStyleSelect />
          <ThemeToggle />
        </div>
      </header>

      <Section
        id="colour"
        title="Colour"
        intro="Six colours, each with one job. Dark mode keeps the same meanings on a deep ink-navy desk."
      >
        <ul className="grid gap-6 sm:grid-cols-2">
          {COLOURS.map((c) => (
            <li key={c.name} className="flex flex-col gap-3">
              <div className="ring-border flex h-16 overflow-hidden rounded-lg ring-1">
                <div className="flex-1" style={{ background: c.light }} />
                <div className="flex-1" style={{ background: c.dark }} />
              </div>
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-graphite text-sm">{c.role}</p>
                <p className="text-graphite mt-1 text-xs">
                  Light {c.light}. Dark {c.dark}. Token {c.token}.
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div role="region" aria-label="Contrast ratios" tabIndex={0} className="overflow-x-auto">
          <table className="w-full max-w-xl text-left text-sm">
            <caption className="text-graphite pb-3 text-left text-sm">
              Contrast ratios. Text needs 4.5 or more; dimmed text and UI need 3 or more.
            </caption>
            <thead>
              <tr className="border-rule border-b">
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Pair
                </th>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Light
                </th>
                <th scope="col" className="py-2 font-semibold">
                  Dark
                </th>
              </tr>
            </thead>
            <tbody>
              {CONTRAST.map((row) => (
                <tr key={row.pair} className="border-rule border-b last:border-b-0">
                  <th scope="row" className="py-2 pr-4 font-normal">
                    {row.pair}
                  </th>
                  <td className="py-2 pr-4">{row.light}</td>
                  <td className="py-2">{row.dark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        id="type"
        title="Type"
        intro="Literata for anything you read: headings, answers, passages, paper titles. Atkinson Hyperlegible Next for the interface. Weights 400 and 600 only."
      >
        <div className="flex flex-col gap-8">
          <Specimen label="Scale, about 1.25">
            <ul className="flex flex-col gap-4">
              {SCALE.map((s) => (
                <li key={s.px} className="flex flex-col gap-1">
                  <span className={`font-heading font-semibold ${s.cls}`}>
                    Every answer can be checked
                  </span>
                  <span className="text-graphite text-xs">
                    {s.px} px, {s.use}
                  </span>
                </li>
              ))}
            </ul>
          </Specimen>
          <Specimen label="Reading text: Literata 17px, line-height 1.6, at most 70 characters wide">
            <p className="reading">
              Participants whose bedtimes varied by more than ninety minutes across the week made
              31% more attention errors on the vigilance task than participants with regular
              bedtimes. The effect held after adjusting for total sleep time, which suggests that
              regularity matters independently of how long people sleep.
            </p>
          </Specimen>
          <Specimen label="Interface text: Atkinson Hyperlegible Next 15px">
            <p className="text-sm">
              Buttons, labels and metadata use this face. It was designed so that similar
              characters, like 1, l and I, are easy to tell apart.
            </p>
          </Specimen>
        </div>
      </Section>

      <Section id="shape" title="Radius" intro="Three shapes, each with one purpose.">
        <div className="flex flex-wrap items-end gap-8">
          <div className="flex flex-col gap-2">
            <div className="bg-sheet ring-border h-14 w-24 rounded-md ring-1" />
            <p className="text-sm">4px, controls</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="bg-sheet ring-border h-14 w-24 rounded-lg ring-1" />
            <p className="text-sm">6px, sheets and popups</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="bg-highlighter ring-ink/30 h-7 w-24 rounded-full ring-1" />
            <p className="text-sm">Pill, citation chips only</p>
          </div>
        </div>
      </Section>

      <Section
        id="controls"
        title="Controls"
        intro="shadcn/ui as the base, restyled to the tokens."
      >
        <div className="flex flex-col gap-10">
          <Specimen label="Button">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Remove paper</Button>
              <Button variant="link">Link</Button>
              <Button disabled>Disabled</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="xs">Extra small</Button>
              <Button size="sm">Small</Button>
              <Button>Default</Button>
              <Button size="lg">Large</Button>
            </div>
          </Specimen>

          <div className="grid gap-10 sm:grid-cols-2">
            <Specimen label="Input">
              <label className="flex flex-col gap-2 text-sm font-semibold">
                Research topic
                <Input placeholder="For example, sleep and attention" />
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold">
                Invalid input
                <Input aria-invalid defaultValue="Something went wrong" />
              </label>
            </Specimen>
            <Specimen label="Textarea">
              <label className="flex flex-col gap-2 text-sm font-semibold">
                Your research idea
                <Textarea placeholder="TODO(copy): Describe your idea in a sentence or two." />
              </label>
            </Specimen>
          </div>

          <Specimen label="Tabs">
            <Tabs defaultValue="answers" className="max-w-xl">
              <TabsList>
                <TabsTrigger value="answers">Answers</TabsTrigger>
                <TabsTrigger value="cards">Paper cards</TabsTrigger>
                <TabsTrigger value="gaps">Gaps</TabsTrigger>
              </TabsList>
              <TabsContent value="answers" className="pt-4 text-sm">
                Answers panel.
              </TabsContent>
              <TabsContent value="cards" className="pt-4 text-sm">
                Paper cards panel.
              </TabsContent>
              <TabsContent value="gaps" className="pt-4 text-sm">
                Gaps panel.
              </TabsContent>
            </Tabs>
          </Specimen>

          <Specimen label="Dialog, sheet, tooltip, menu and toast">
            <div className="flex flex-wrap items-center gap-3">
              <Dialog>
                <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Remove this paper?</DialogTitle>
                    <DialogDescription>
                      TODO(copy): Answers that cite it will lose those citations.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="destructive">Remove</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Sheet>
                <SheetTrigger render={<Button variant="outline" />}>Open drawer</SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>Library</SheetTitle>
                    <SheetDescription>TODO(copy): Your papers appear here.</SheetDescription>
                  </SheetHeader>
                </SheetContent>
              </Sheet>

              <Tooltip>
                <TooltipTrigger render={<Button variant="outline" />}>
                  Hover or focus me
                </TooltipTrigger>
                <TooltipContent>Tooltips show on focus too</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" />}>
                  Open menu
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Rename</DropdownMenuItem>
                  <DropdownMenuItem>Download</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" onClick={() => toast("TODO(copy): Paper added.")}>
                Show toast
              </Button>
              <Button
                variant="outline"
                onClick={() => toast.error("TODO(copy): That upload failed.")}
              >
                Show error toast
              </Button>
            </div>
          </Specimen>

          <div className="grid gap-10 sm:grid-cols-2">
            <Specimen label="Progress">
              <Progress value={62} aria-label="Reading paper" className="max-w-sm" />
            </Specimen>
            <Specimen label="Skeleton">
              <div className="flex max-w-sm flex-col gap-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </Specimen>
          </div>

          <Specimen label="Scroll area">
            <ScrollArea className="bg-sheet ring-border h-32 max-w-md rounded-lg ring-1">
              <ul className="flex flex-col gap-2 p-4 text-sm">
                {papers.concat(papers).map((p, i) => (
                  <li key={`${p.id}-${i}`}>{p.title}</li>
                ))}
              </ul>
            </ScrollArea>
          </Specimen>
        </div>
      </Section>

      <Section
        id="litlens"
        title="LitLens components"
        intro="Built from the controls above. Sample data only; every paper is invented."
      >
        <div className="flex flex-col gap-12">
          <Specimen label="CitationChip: resting and chosen">
            <LensProvider>
              <div className="flex flex-wrap items-center gap-3">
                <CitationChip
                  passageId="x1"
                  label="Calloway 2023, p. 4"
                  accessibleName="Source: Calloway 2023, p. 4"
                />
                <CitationChip
                  passageId="x2"
                  label="Hartigan 2022, p. 3"
                  accessibleName="Source: Hartigan 2022, p. 3"
                />
                <span className="text-graphite text-sm">Choose one to see the chosen state.</span>
              </div>
            </LensProvider>
          </Specimen>

          <Specimen label="SourcePassage: idle, focused and dimmed">
            <LensProvider>
              <div className="bg-sheet grid gap-8 rounded-lg p-6 lg:grid-cols-3">
                <SourcePassage passage={passages[0]} paper={papers[0]} state="idle" />
                <SourcePassage passage={passages[1]} paper={papers[0]} state="focused" />
                <SourcePassage passage={passages[2]} paper={papers[1]} state="dimmed" />
              </div>
            </LensProvider>
          </Specimen>

          <Specimen label="Answer and source sheet: the lens. Choose a chip, or Tab to it and press Enter. Esc clears.">
            <LensDemo />
          </Specimen>

          <Specimen label="Citation styles: the same paper, formatted six ways">
            <div className="flex flex-col gap-6">
              {CITATION_STYLES.map((s) => (
                <div key={s.id} className="flex flex-col gap-1">
                  <p className="text-sm font-semibold">{s.label}</p>
                  <p className="text-graphite text-sm">
                    In text: {inTextLabel(papers[0], 4, s.id, 1)}
                  </p>
                  <p className="reading text-sm">
                    {referenceParts(papers[0], s.id, 1).map((part, i) =>
                      part.italic ? <i key={i}>{part.text}</i> : <span key={i}>{part.text}</span>,
                    )}
                  </p>
                  <p className="sr-only">{styleInfo(s.id).listTitle}</p>
                </div>
              ))}
            </div>
          </Specimen>

          <Specimen label="PaperRow: Uploading, Reading, Ready, Failed">
            <ul className="bg-sheet max-w-md rounded-lg px-6 py-2">
              <PaperRow paper={{ ...papers[2], id: "d1", status: "uploading", progress: 34 }} />
              <PaperRow paper={{ ...papers[2], id: "d2", status: "reading", progress: 62 }} />
              <PaperRow paper={{ ...papers[0], id: "d3" }} selected />
              <PaperRow paper={{ ...papers[1], id: "d4", status: "failed" }} />
            </ul>
          </Specimen>

          <Specimen label="PaperCard">
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <PaperCard paper={papers[0]} />
              <PaperCard paper={papers[2]} />
            </div>
          </Specimen>

          <Specimen label="UploadDropzone: resting, error, disabled">
            <div className="grid gap-6 md:grid-cols-3">
              <UploadDropzone />
              <UploadDropzone error="TODO(copy): That file is over 50 MB." />
              <UploadDropzone disabled />
            </div>
          </Specimen>

          <Specimen label="EmptyState: neutral and error">
            <div className="grid gap-8 sm:grid-cols-2">
              <EmptyState
                title="TODO(copy): No papers yet."
                description="TODO(copy): Upload a paper to start asking questions."
                action={<Button variant="outline">Choose files</Button>}
              />
              <EmptyState
                tone="error"
                title="TODO(copy): Something went wrong."
                description="TODO(copy): Try again in a moment."
                action={<Button variant="outline">Try again</Button>}
              />
            </div>
          </Specimen>

          <Specimen label="References with missing metadata (gaps are marked, nothing is invented)">
            <article className="sheet px-6 pb-6">
              <ReferenceList
                style="apa"
                references={[
                  {
                    number: 1,
                    paper: {
                      ...papers[0],
                      volume: undefined,
                      issue: undefined,
                      articlePages: undefined,
                    },
                  },
                  { number: 2, paper: { ...papers[1], year: undefined } },
                ]}
              />
            </article>
          </Specimen>

          <Specimen label="Library, empty (with the compact demo loop)">
            <div className="max-w-xs">
              <LibraryPane papers={[]} selectedId={null} onSelect={() => {}} />
            </div>
          </Specimen>

          <Specimen label="DemoLoop: full (home), quiet (sign-in) and compact (empty library)">
            <div className="flex flex-col gap-6">
              <DemoLoop variant="full" />
              <DemoLoop variant="quiet" />
              <DemoLoop variant="compact" />
            </div>
          </Specimen>
        </div>
      </Section>
    </div>
  );
}
