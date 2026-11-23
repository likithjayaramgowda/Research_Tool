# 5. Motion scope: a live demo loop on screens with nothing to read (D19)

Date: 2026-11-24
Status: Accepted

## Context
LitLens's promise is that every answer can be checked. A landing page that only describes that is
weaker than one that shows it. Earlier, the only motion allowed was a response to an action, plus
a hero example that plays once. Motion behind long-form text, though, fights the task the app
exists for: reading.

## Decision
LitLens gets a live animated background in exactly three places, all screens with nothing to read:

- **Home:** the full loop, beside and behind the hero.
- **Sign-in:** a quieter variant (slower, fainter, plays once).
- **Library empty state:** a compact variant.

The animation is the real interaction replaying itself: a sheet settles, a question types into
the ask box, the answer appears a sentence at a time, a chip appears, the chip activates and its
source passage lights up in highlighter yellow, then it holds, fades and restarts (about 13.7 s).

The library, answer column and source panel (the reading surfaces) never animate on their own.

How it is kept safe (`components/litlens/demo-loop.tsx`):
- One self-contained component on hardcoded sample data, built from the real chip, passage,
  sentence, textarea and button components, so it cannot drift from the design system. Removing it
  means deleting the file and its three uses.
- One Motion timeline, animating transform and opacity only.
- Reduced motion, first paint and no-JavaScript show the static end state.
- Pauses when off-screen and when the tab is hidden. Its space is fixed, so nothing shifts.
- Hidden from assistive technology and not focusable: it is decoration.
- No video, GIF, canvas or particle library; no gradients, shadow-card grids, all-caps labels,
  eyebrows or arrows (the D17 avoid list still applies).

## Consequences
- On wide screens the home loop sits in the right half of the hero, in front of nothing and
  behind the hero content in stacking order, and the text column is kept clear of it. Yellow
  behind text cannot meet AA contrast in dark mode (a test with the loop forced behind the
  headline fails at 1.2 to 3.3:1), so the layout, not a veil, is what keeps AA. A test samples
  real pixels under the headline, paragraph and buttons across a whole loop at 1280, 1024 and 390.
- Home keeps a mobile Lighthouse performance score of 90 or more (measured on a production build).
- The earlier landing example (`HeroLens`, interactive, plays once) moved to its own section below
  the hero, because the loop took its place.
- Adding a fourth place for the loop, or animating a reading surface, needs a new decision.
