# LitLens design system

LitLens is a reading tool for research students. Its promise is that **every answer can be checked
against its source**. The look is a light table for papers: white sheets on a cool desk,
ink-coloured text, and one highlighter yellow that only ever means "evidence".

See it live at `/design` (both modes, every token and component). The reasoning is in
[ADR 0003](adr/0003-design-system.md). Tokens live in `apps/web/src/app/globals.css`.

## Colour

Six colours, each with one job. Dark mode keeps the same meanings on a deep ink-navy desk.

| Token | Light | Dark | Job |
|---|---|---|---|
| `--desk` | `#E9EDF0` | `#0E1524` | App background |
| `--sheet` | `#FFFFFF` | `#17223A` | Reading surfaces: answers, passages, paper cards |
| `--ink` | `#18233A` | `#E9EDF0` | Text, primary buttons, focus rings |
| `--graphite` | `#5B6675` | `#A3AEBD` | Secondary text, borders, icons |
| `--highlighter` | `#FFE14D` | `#FFE14D` | Citations and highlighted passages **only** |
| `--alert` | `#B42318` | `#FF8A80` | Errors **only** |

Text on yellow is always ink-navy (`--on-highlighter`, `#18233A`) in both modes. The dark alert
colour is lighter so it keeps its contrast on navy. The shadcn names (`--background`, `--primary`,
`--border`, and so on) are mapped onto these six, so shadcn components follow the palette.

Contrast (WCAG relative luminance; AA needs 4.5 for text, 3 for large text and UI):

| Pair | Light | Dark |
|---|---|---|
| Ink on desk | 13.31 | 15.49 |
| Ink on sheet | 15.67 | 13.45 |
| Graphite on desk | 4.95 | 8.12 |
| Graphite on sheet | 5.83 | 7.05 |
| Ink on highlighter | 12.03 | 12.03 |
| Alert on sheet | 6.57 | 6.94 |
| Dimmed ink (65%) on sheet | 4.97 | 6.47 |

Form-field outlines use full graphite (5.8:1). Dividers use graphite at 35% and are decorative.

## Type

- **Literata** (variable, `next/font`): headings, answers, passages, paper titles. Reading text is
  17px with line-height 1.6 and `max-width: 70ch` (the `.reading` class).
- **Atkinson Hyperlegible Next** (variable, `next/font`): UI, buttons, labels, metadata. 15px base.
- **Scale, about 1.25:** 13, 15, 17, 21, 26, 33, 41, 52 px, as Tailwind `text-xs` to `text-4xl`.
- **Weights:** 400 and 600 only. Never 500 or 700.

## Shape

| Radius | Used for |
|---|---|
| 4px (`rounded-md`) | Controls: buttons, inputs |
| 6px (`rounded-lg` and up) | Sheets, dialogs, menus |
| Pill | Citation chips and nothing else |

## The lens

Choosing a citation chip brings its source into focus.

1. The source sheet scrolls so the passage is centred.
2. The passage gets the yellow highlight.
3. Every other passage dims to 65% opacity. Ink text at 65% is 4.97:1 on the light sheet and 6.47:1
   on the dark one, above the 3:1 floor in the brief and above AA's 4.5:1.

It is animated with Motion in 150 ms (the cap is 200 ms), and is instant under
`prefers-reduced-motion`. Keyboard: Tab to a chip, Enter or Space chooses it, Escape clears it.
A visually hidden live region announces the focused passage to screen readers.

The dimming applies to the source sheet only. The answer stays at full contrast, because it is
what the reader is still reading.

Code: `components/litlens/lens.tsx` (state, scrolling), `citation-chip.tsx`, `source-passage.tsx`,
`source-sheet.tsx`.

## Rules

Do:
- Left-align text and use generous whitespace. Show hierarchy with type and spacing.
- Keep a visible focus ring on everything interactive (2px ink, pale ink on dark).
- Make layouts work at 360px wide with no sideways scrolling.
- Respond to `prefers-reduced-motion` and `prefers-color-scheme`.
- Put placeholder wording in `TODO(copy): ...` so it is easy to find and replace.

Never:
- Gradients.
- Grids of shadowed cards.
- One radius on everything.
- All-caps labels.
- Small labels above headings.
- Arrows added to button text.
- Monospace for small labels.
- Text joined with dots.
- Yellow for anything but citations and highlighted passages. Red for anything but errors.
- Motion that is not a response to an action. The one exception is the landing hero, which plays
  once.

## Components

shadcn/ui (Base UI flavour) restyled to the tokens: Button, Input, Textarea, Tabs (underline
style), Dialog, Sheet (drawer), Tooltip, DropdownMenu, Sonner toasts, Skeleton, Progress,
ScrollArea.

LitLens components in `apps/web/src/components/litlens/`:

| Component | What it is |
|---|---|
| `CitationChip` | The pill that names a source, such as "Calloway 2023, p. 4". A real button. |
| `SourcePassage` | A quoted passage; idle, focused (yellow) or dimmed. |
| `SourceSheet` | The scrolling sheet of passages grouped by paper. |
| `Answer` | Sentences as one paragraph, each followed by its chips. |
| `PaperRow` | A library row with status Uploading, Reading, Ready or Failed. |
| `PaperCard` | Title plus Question, Method, Data, Findings, Limitations. |
| `UploadDropzone` | Drag or choose PDFs. UI only. |
| `EmptyState` | Title, description and an optional action; neutral or error. |
| `ComparisonTable` | Papers side by side: design, sample, duration, main finding. |
| `GapGrid` | Gap Check: parts of the student's idea against each paper. Status is icon plus words. |
| `HeroLens` | The landing page's working example of the lens. Plays once, then waits. |
| `AppShell` | The three-pane reading desk, with `LibraryPane` and `ConversationPane`. |

Sample data is in `apps/web/src/lib/fixtures.ts`. Every paper in it is invented.

## Citation styles

The student picks a style (APA 7, MLA 9, Chicago author-date, Harvard, IEEE or Vancouver) from
the "Citations" menu and everything re-formats at once: the text on every chip, the way papers are
named in the library, source sheet and paper cards, and the reference list under each answer
(titled "References", "Works cited" or "Reference list" as the style requires, with a copy button).
The choice is remembered in the browser.

How it works: papers are stored as **structured data** (authors with family and given names, year,
journal, volume, issue, pages). Nothing is stored as ready-made citation text. `lib/citation.ts`
holds pure functions that format that data per style, so a new style is one more case in a few
functions and nothing else changes. The numbered styles (IEEE, Vancouver) number papers in the
order the answer first cites them.

Limits to know about: journal articles only; no DOIs, editors or books; sentence case for titles
cannot spot proper nouns; no handling of 7 or more authors. Always check against your own style
guide. Each style's rules are covered by tests in `e2e/citation.unit.spec.ts`.

Code: `lib/citation.ts`, `components/citation/` (provider and menu).

## Pages

- **`/` landing.** Hero with the headline and a working example of the lens (plays once about
  0.9 s after load, then waits; if the visitor chooses a chip first, it never plays). "Try the
  demo" goes to `/demo`, "Sign in with Google" to the `/sign-in` placeholder. Then "How it works"
  (upload, ask, check), then previews built from the real components (paper card, comparison
  table, Gap Check), then the footer.
- **`/demo` and `/app`.** The reading desk. Library (paper rows and the dropzone) on the left,
  Conversation (Answers, Paper cards, Gaps) in the middle, Source sheet on the right. Below 1024px
  the library is a drawer and the source is a bottom sheet that opens by itself when a chip is
  chosen. Both routes show the same sample data, labelled "Sample data", until slice 2.6.
- **`/sign-in`.** Placeholder.
- **`/design`.** Every token and component.

## Checking it

`pnpm --dir apps/web test:unit` runs the citation-format tests (no browser, under a second).

`pnpm --dir apps/web test:e2e` builds the site and, for each page (`/`, `/demo`, `/app`, `/sign-in`,
`/design`), in light and dark at 1280px and 390px: takes a screenshot (saved to `docs/screenshots/`), fails on any serious or critical axe
issue (WCAG 2.2 AA), and fails if the page scrolls sideways. It also tests the lens by mouse and
keyboard, the landing example's autoplay, the shell on wide and phone screens, switching citation
styles, reduced motion, the theme toggle, and runs axe on open overlays (drawer, bottom sheet,
menus). Screenshots of those interactive states are saved too.
