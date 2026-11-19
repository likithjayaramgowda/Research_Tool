import Link from "next/link";

import { ComparisonTable } from "@/components/litlens/comparison-table";
import { GapGrid } from "@/components/litlens/gap-grid";
import { HeroLens } from "@/components/litlens/hero-lens";
import { PaperCard } from "@/components/litlens/paper-card";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { buttonVariants } from "@/components/ui/button";
import { comparison, gapCheck, papers } from "@/lib/fixtures";

const STEPS = [
  {
    title: "Upload",
    body: "Add up to 30 papers, 50 MB each, to a private workspace. LitLens reads every one and builds a paper card for it.",
  },
  {
    title: "Ask",
    body: "Ask a question in your own words. The answer comes only from your papers, and every sentence carries a citation chip. Chips follow your citation style: APA, MLA, Chicago, Harvard, IEEE or Vancouver.",
  },
  {
    title: "Check",
    body: "Choose a chip and the source sheet scrolls to the exact passage and highlights it. If the answer is not in your papers, LitLens tells you.",
  },
];

const FEATURES = [
  {
    id: "feature-cards",
    title: "Paper cards",
    body: "Each paper boiled down to its question, method, data, findings and limitations, so you can tell at a glance whether to read it closely.",
    preview: <PaperCard paper={papers[0]} />,
  },
  {
    id: "feature-compare",
    title: "Compare papers",
    body: "The same few facts for every paper, side by side, so differences in design and sample stand out.",
    preview: <ComparisonTable rows={comparison} />,
  },
  {
    id: "feature-gaps",
    title: "Gap Check",
    body: "Write down your own research idea. LitLens breaks it into parts and shows which ones your papers already study, and which nobody does yet.",
    preview: <GapGrid data={gapCheck} />,
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section
          aria-labelledby="hero-heading"
          className="mx-auto grid w-full max-w-6xl items-start gap-12 px-4 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:py-20"
        >
          <div className="flex flex-col items-start gap-6">
            <h1 id="hero-heading" className="text-3xl sm:text-4xl lg:text-4xl">
              Ask your papers. See exactly where each answer comes from.
            </h1>
            <p className="text-graphite max-w-xl text-base">
              Upload up to 30 papers. LitLens answers only from them, cites the page for every
              sentence, and tells you when the answer isn&apos;t there.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/demo" className={buttonVariants({ size: "lg" })}>
                Try the demo
              </Link>
              <Link href="/sign-in" className={buttonVariants({ size: "lg", variant: "outline" })}>
                Sign in with Google
              </Link>
            </div>
          </div>
          <HeroLens />
        </section>

        <section
          id="how-it-works"
          aria-labelledby="how-heading"
          className="mx-auto w-full max-w-6xl scroll-mt-8 px-4 py-16 sm:px-8"
        >
          <h2 id="how-heading" className="text-2xl">
            How it works
          </h2>
          <ol className="mt-10 grid list-none gap-10 p-0 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex max-w-sm flex-col gap-3">
                <h3 className="text-lg">
                  <span className="text-graphite">{i + 1}.</span> {step.title}
                </h3>
                <p className="reading text-base">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="more-heading"
          className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-4 py-16 sm:px-8"
        >
          <h2 id="more-heading" className="text-2xl">
            More than answers
          </h2>
          {FEATURES.map((feature) => (
            <section
              key={feature.id}
              aria-labelledby={feature.id}
              className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12"
            >
              <div className="flex max-w-md flex-col gap-3">
                <h3 id={feature.id} className="text-xl">
                  {feature.title}
                </h3>
                <p className="reading text-base">{feature.body}</p>
              </div>
              <div className="min-w-0">{feature.preview}</div>
            </section>
          ))}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
