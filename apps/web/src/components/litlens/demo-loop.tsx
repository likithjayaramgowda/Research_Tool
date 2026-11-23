"use client";

import { stagger, useAnimate, type AnimationSequence } from "motion/react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Paper, Passage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AnswerSentence } from "./answer";
import { CitationChip } from "./citation-chip";
import { LensProvider } from "./lens";
import { SourcePassage } from "./source-passage";

/**
 * The live demo loop (decision D19, docs/adr/0005): the real interaction replaying itself, as a
 * background for screens with nothing to read. A sheet settles, a question types into the ask
 * box, the answer appears one sentence at a time, a citation chip appears, the chip activates and
 * its source passage lights up in highlighter yellow, then it holds, fades and starts again.
 *
 * Rules this file keeps (change them only with the owner):
 *  - One self-contained component on hardcoded sample data. It is built from the real chip,
 *    passage, sentence, textarea and button components, so it cannot drift from the design system.
 *    Delete this file and its three uses to remove it; the shell is untouched.
 *  - One Motion timeline. Only transform and opacity are animated, never layout. The "highlight"
 *    and the "active chip" are a second copy of the real component laid exactly on top of the
 *    first and faded in, so even those are opacity-only.
 *  - First paint, reduced motion and no-JavaScript all show the end state (the DOM below is the
 *    end state; the timeline hides things only once it starts).
 *  - It pauses while off-screen and while the tab is hidden.
 *  - Its space is fixed (the stage has a set size), so nothing shifts when it starts.
 *  - It is decorative: hidden from assistive technology and not focusable.
 */

export type DemoLoopVariant = "full" | "quiet" | "compact";

const SAMPLE_PAPER: Paper = {
  id: "demo-p",
  title: "Sample paper",
  authors: [{ family: "Calloway", given: "Aisha Marie" }],
  year: 2023,
  pageCount: 18,
  status: "ready",
};

const QUESTION = "Does irregular sleep affect attention in shift workers?";

const SENTENCES = [
  {
    id: "demo-1",
    text: "Shift workers whose bedtimes varied widely made about 31% more attention errors.",
    chip: "Calloway et al., 2023, p. 4",
    passageId: "demo-s1",
  },
  {
    id: "demo-2",
    text: "This held after accounting for how long they slept.",
    chip: "Calloway et al., 2023, p. 7",
    passageId: "demo-s2",
  },
];

const PASSAGES: Passage[] = [
  {
    id: "demo-s1",
    paperId: "demo-p",
    page: 4,
    text: "Participants whose bedtimes varied by more than ninety minutes made 31% more attention errors than those with regular bedtimes.",
  },
  {
    id: "demo-s2",
    paperId: "demo-p",
    page: 7,
    text: "The effect held after adjusting for total sleep time.",
  },
];

/** Per variant: how big it is on screen, how bright, how fast, and whether it repeats. */
const VARIANTS: Record<
  DemoLoopVariant,
  { box: string; scale: string; tone: string; speed: number; loop: boolean }
> = {
  // The stage is 600x400 design pixels. The wrapper reserves its scaled size: 0.58 on phones,
  // 0.8 at 1024 so it clears the hero text, 1 from 1280.
  full: {
    box: "h-[232px] w-[348px] sm:h-[400px] sm:w-[600px] lg:h-[320px] lg:w-[480px] xl:h-[400px] xl:w-[600px]",
    scale: "scale-[0.58] sm:scale-100 lg:scale-[0.8] xl:scale-100",
    tone: "opacity-60 dark:opacity-45",
    speed: 1,
    loop: true,
  },
  quiet: {
    box: "h-[232px] w-[348px] sm:h-[400px] sm:w-[600px] lg:h-[320px] lg:w-[480px] xl:h-[400px] xl:w-[600px]",
    scale: "scale-[0.58] sm:scale-100 lg:scale-[0.8] xl:scale-100",
    tone: "opacity-35 dark:opacity-25",
    speed: 0.6,
    loop: false,
  },
  compact: {
    box: "h-[180px] w-[270px]",
    scale: "scale-[0.45]",
    tone: "opacity-90 dark:opacity-70",
    speed: 1,
    loop: true,
  },
};

const sel = (name: string) => `[data-demo="${name}"]`;

export function DemoLoop({
  variant = "full",
  className,
}: {
  variant?: DemoLoopVariant;
  className?: string;
}) {
  const { box, scale, tone, speed, loop } = VARIANTS[variant];
  const [scope, animate] = useAnimate<HTMLDivElement>();

  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return; // the static end state is already on screen

    type Controls = ReturnType<typeof animate>;
    let active: Controls | undefined;
    let visible = false;
    let started = false;
    let wantsStart = false;
    let cancelled = false;
    const canRun = () => visible && !document.hidden;

    // One timeline, in seconds. About 13.7s in all for the looping variants.
    const timeline = () => {
      const settle = { y: [-18, 0], opacity: [0, 1] };
      const appear = { opacity: [0, 1], scale: [0.85, 1] };
      const steps: AnimationSequence = [
        [sel("stage"), { opacity: [0, 1] }, { duration: 0.5, at: 0 }],
        [sel("source"), settle, { duration: 0.7, at: 0.2, ease: "easeOut" }], // 1 a sheet settles
        [sel("ask"), settle, { duration: 0.7, at: 0.6, ease: "easeOut" }],
        [sel("answer"), settle, { duration: 0.7, at: 1.0, ease: "easeOut" }],
        [
          sel("char"), // 2 the question types
          { opacity: [0, 1] },
          { duration: 0.01, at: 1.9, delay: stagger(0.04) },
        ],
        [sel("ask-button"), { scale: [1, 0.92, 1] }, { duration: 0.3, at: 4.4 }],
        [sel("sentence-1"), { opacity: [0, 1] }, { duration: 0.6, at: 4.9 }], // 3 one sentence
        [sel("chip-1"), appear, { duration: 0.4, at: 5.7 }], // 4 a chip appears
        [sel("sentence-2"), { opacity: [0, 1] }, { duration: 0.6, at: 6.7 }],
        [sel("chip-2"), appear, { duration: 0.4, at: 7.5 }],
        [sel("chip-1-on"), { opacity: [0, 1], scale: [1, 1.08, 1] }, { duration: 0.45, at: 9.0 }], // 5
        [sel("highlight"), { opacity: [0, 1] }, { duration: 0.45, at: 9.2 }],
        [sel("passage-2"), { opacity: [1, 0.65] }, { duration: 0.45, at: 9.2 }],
      ];
      if (loop) steps.push([sel("stage"), { opacity: [1, 0] }, { duration: 0.7, at: 13.0 }]); // 6
      return steps;
    };

    const play = () => {
      started = true;
      active = animate(timeline(), loop ? { repeat: Infinity } : {});
      active.speed = speed;
      if (!canRun()) active.pause();
    };

    // First the end state (what the visitor already sees) fades away, then the timeline starts.
    const begin = () => {
      wantsStart = false;
      const stage = root.querySelector<HTMLElement>(sel("stage"));
      if (!stage || cancelled) return;
      active = animate(stage, { opacity: 0 }, { duration: 0.5 / speed });
      active.then(() => {
        if (!cancelled) play();
      });
    };

    const sync = () => {
      if (!started && wantsStart && canRun()) begin();
      if (!active) return;
      if (canRun()) active.play();
      else active.pause();
    };

    const observer = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      sync();
    });
    observer.observe(root);
    const onVisibility = () => sync();
    document.addEventListener("visibilitychange", onVisibility);
    const onReduceChange = () => {
      if (reduce.matches) {
        cancelled = true;
        active?.cancel(); // back to the static end state
      }
    };
    reduce.addEventListener("change", onReduceChange);

    const timer = window.setTimeout(() => {
      wantsStart = true;
      sync();
    }, 1200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduce.removeEventListener("change", onReduceChange);
      active?.cancel();
    };
  }, [scope, animate, loop, speed]);

  return (
    <div
      aria-hidden="true"
      inert
      data-demo-loop=""
      data-variant={variant}
      className={cn("pointer-events-none select-none", box, tone, className)}
    >
      <LensProvider>
        <div ref={scope} className={cn("h-[400px] w-[600px] origin-top-left", scale)}>
          <div data-demo="stage" className="relative h-full w-full">
            {/* Left: the ask box, then the answer. */}
            <div className="absolute top-0 left-0 flex w-[300px] flex-col gap-3">
              <div data-demo="ask" className="relative">
                <Textarea
                  readOnly
                  tabIndex={-1}
                  rows={2}
                  className="h-[84px] resize-none text-sm"
                />
                <p className="absolute inset-0 border border-transparent px-2.5 py-2 text-sm leading-normal">
                  {Array.from(QUESTION).map((char, i) => (
                    <span key={i} data-demo="char">
                      {char}
                    </span>
                  ))}
                </p>
                <Button
                  size="sm"
                  tabIndex={-1}
                  data-demo="ask-button"
                  className="absolute right-2 bottom-2"
                >
                  Ask
                </Button>
              </div>
              <article data-demo="answer" className="sheet px-6 py-5">
                <p className="reading">
                  {SENTENCES.map((sentence, i) => (
                    <span key={sentence.id} data-demo={`sentence-${i + 1}`}>
                      <AnswerSentence
                        id={sentence.id}
                        text={sentence.text}
                        chips={[
                          <span
                            key={sentence.passageId}
                            data-demo={`chip-${i + 1}`}
                            className="relative inline-flex"
                          >
                            <CitationChip
                              passageId={sentence.passageId}
                              sentenceId={sentence.id}
                              label={sentence.chip}
                              accessibleName={`Source: ${sentence.chip}`}
                              pressed={false}
                            />
                            {i === 0 && (
                              // The same chip, chosen, laid exactly on top and faded in.
                              <span data-demo="chip-1-on" className="absolute inset-0">
                                <CitationChip
                                  passageId={sentence.passageId}
                                  sentenceId={sentence.id}
                                  label={sentence.chip}
                                  accessibleName={`Source: ${sentence.chip}`}
                                  pressed
                                />
                              </span>
                            )}
                          </span>,
                        ]}
                      />
                    </span>
                  ))}
                </p>
              </article>
            </div>

            {/* Right: the source sheet. */}
            <section
              data-demo="source"
              className="sheet absolute top-0 right-0 flex h-full w-[288px] flex-col gap-5 px-5 py-5"
            >
              <h2 className="text-lg">Source</h2>
              <div data-demo="passage-1" className="relative">
                <SourcePassage passage={PASSAGES[0]} paper={SAMPLE_PAPER} state="idle" />
                <div data-demo="highlight" className="absolute inset-0">
                  <SourcePassage passage={PASSAGES[0]} paper={SAMPLE_PAPER} state="focused" />
                </div>
              </div>
              <div data-demo="passage-2">
                <SourcePassage passage={PASSAGES[1]} paper={SAMPLE_PAPER} state="idle" />
              </div>
            </section>
          </div>
        </div>
      </LensProvider>
    </div>
  );
}
