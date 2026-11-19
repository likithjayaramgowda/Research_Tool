# 4. Citation styles are formatted at display time

Date: 2026-11-19
Status: Accepted

## Context
Students must cite in the style their department requires (APA, MLA, Chicago and others), and they
may switch style as they move between assignments. LitLens shows a citation on every answer
sentence and names every paper, so the choice touches almost every screen.

## Decision
Papers are stored as **structured data**: authors (family and given name), year, journal, volume,
issue and page range. Citation text is never stored. A set of pure functions in `lib/citation.ts`
turns that data into text for the chosen style: in-text labels for chips, short names for lists,
and full reference-list entries.

Six styles are supported to start: APA 7, MLA 9, Chicago (author-date), Harvard, IEEE and
Vancouver. They cover three families: author-date, author-page and numbered. The choice lives in a
menu and is remembered in the browser. Answers record which paper and page a sentence cites, never
how to write it, so they re-format the moment the style changes.

## Consequences
- Switching style is instant and consistent everywhere. Adding a style means adding a case to a few
  functions plus tests.
- Correctness depends on the metadata being complete. Metadata will come from the paper itself
  (slice 2.x) and may be incomplete or wrong, so the student should be able to edit it. Not built yet.
- Formatting rules are encoded by hand and tested against known-correct examples, but they cover
  journal articles only (no DOIs, editors, books or 7+ author rules). The UI and docs say to check
  against the style guide.
- Numbered styles need the order papers are first cited in an answer, so that numbering is computed
  per answer.
- In a later slice the style could be saved per account (it is per browser for now).
