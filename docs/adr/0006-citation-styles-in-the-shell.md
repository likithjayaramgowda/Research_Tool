# 6. Citation styles stay in the app shell, and references degrade gracefully (D20)

Date: 2026-11-24
Status: Accepted, conditional (revisit after slice 1.2)

## Context
[ADR 0004](0004-citation-styles.md) made citation text a display-time view of structured paper
data, with a style switcher in the app. That raised a risk (R5): the data will come from a PDF
parser, and slice 1.2 has not yet shown what reference metadata Docling actually returns. If the
parser misses a volume or a page range, a formatter that fills the hole with something plausible
puts a made-up fact into a student's bibliography, and LitLens exists so that every claim is
checkable.

## Decision
The style switcher and the References block stay in the app shell, **on the condition that
references never invent anything**:

- Journal, volume, issue, page range (and, later, publisher) may be missing. A missing field is
  shown in its place as a visible gap such as `[volume missing]`, on a tinted chip, in words, never
  by colour alone. The known parts are kept.
- A paper missing an author, title or year cannot be formatted in any style. The entry says so
  plainly ("cannot be formatted in APA 7. Missing: year.") instead of rendering a malformed
  reference. A table in `lib/citation.ts` (`REQUIRED_FIELDS`) lets one style differ later.
- Chips and short names mark a missing year or author the same way. We never write "n.d." or
  "Anonymous": those are style conventions that assert something the data does not say.
- "Copy references" copies exactly what is displayed, gaps included. One function
  (`referenceParts`) feeds both the screen and the clipboard, so they cannot differ.
- `publisher` is on the `Paper` type but is not printed for journal articles, so it has no gap
  marker yet. It will matter when books and reports are supported.

## Consequences
- Every field of `Paper` except the id is optional, and tests cover each of the six styles with
  complete metadata and with volume, issue and page range missing, plus the unusable cases.
- The student sees what the parser did not find, and can fix it when metadata editing exists
  (not built).
- **Revisit after slice 1.2.** If the parser returns metadata that is too thin or too wrong to be
  useful, moving the styles out of the shell (for example to an export step, or to a "paste your
  reference" flow) becomes the better design. This decision is conditional on that evidence.
