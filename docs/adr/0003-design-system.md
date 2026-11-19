# 3. Design system: a light table for papers

Date: 2026-11-19
Status: Accepted

## Context
LitLens is a reading tool, and its one promise is that every answer can be checked against its
source. Many AI products look alike (purple gradients, glowing cards, chat bubbles). The interface
should instead make checking feel natural and trustworthy, and it should be accessible, since the
users read for long stretches.

## Decision
A "light table for papers": white sheets on a cool desk, ink-coloured text, and a single
highlighter yellow that only ever means evidence.

- **One meaning per colour.** Yellow appears only on citation chips and the highlighted passage. Red
  appears only for errors. Because yellow is never decoration, seeing yellow always tells the user
  "this is where it came from". Details are in [design.md](../design.md).
- **Serif for reading, sans for tools.** Literata (a serif designed for long on-screen reading) is
  used for everything the user reads: answers, passages, paper titles. Atkinson Hyperlegible Next,
  designed for legibility, is used for the interface. Two faces, two jobs.
- **The lens.** Choosing a citation scrolls to the passage, highlights it and dims the rest. It
  turns "trust me" into "look". It is the one signature interaction and the only motion beyond
  the landing hero.
- **Hierarchy from type and space, not boxes.** No gradients, shadow-card grids, all-caps labels or
  one-size-fits-all radius. These are the common marks of generic templates.
- **Accessibility as a build gate.** WCAG 2.2 AA contrast, visible focus everywhere, layouts to
  360px, reduced-motion support, and an automated axe check that fails the test run.
- **Tokens first.** Colours, type and radii are CSS variables with a dark set, mapped onto the
  shadcn names so every shadcn component follows the palette automatically.

## Consequences
- shadcn components are customised more than usual (no medium weights, 4px and 6px radii only,
  stronger focus rings, an underline tab style). Upgrading shadcn means re-checking those edits.
- The yellow rule is a convention, enforced by review and tests, not by the compiler. Anyone adding
  yellow elsewhere breaks the product's central signal.
- Dimmed text had to be pushed to 65% opacity so it passes AA (4.5:1) and not just the 3:1 floor in
  the brief. The dimming is therefore gentler, and the yellow highlight does most of the work.
- Dark mode is a first-class mode with its own measured contrast values, not an inversion.
- Sample data (`fixtures.ts`) powers every page until slice 2.6 connects real data.
