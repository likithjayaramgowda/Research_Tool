/**
 * Citation formatting: turns a paper's structured data into text in a chosen style.
 *
 * Papers are stored as data (authors, year, journal...), never as ready-made citation text, so
 * switching style just re-runs these functions. They are pure (no React, no browser) so they are
 * easy to test. Relative imports only, so the test runner can load this file too.
 *
 * Covers journal articles, which is what LitLens papers are. Not covered yet: DOIs, editors,
 * books, and style rules for 7 or more authors. Always check against your own style guide.
 */
import type { AnswerData, Author, CitationStyle, Paper } from "./types";

export type StyleKind = "author-date" | "author-page" | "numbered";

export interface StyleInfo {
  id: CitationStyle;
  label: string;
  kind: StyleKind;
  /** What this style calls the list at the end: "References", "Works cited"... */
  listTitle: string;
}

export const CITATION_STYLES: StyleInfo[] = [
  { id: "apa", label: "APA 7", kind: "author-date", listTitle: "References" },
  { id: "mla", label: "MLA 9", kind: "author-page", listTitle: "Works cited" },
  { id: "chicago", label: "Chicago (author-date)", kind: "author-date", listTitle: "References" },
  { id: "harvard", label: "Harvard", kind: "author-date", listTitle: "Reference list" },
  { id: "ieee", label: "IEEE", kind: "numbered", listTitle: "References" },
  { id: "vancouver", label: "Vancouver", kind: "numbered", listTitle: "References" },
];

export const DEFAULT_CITATION_STYLE: CitationStyle = "apa";

export function isCitationStyle(value: unknown): value is CitationStyle {
  return CITATION_STYLES.some((s) => s.id === value);
}

export function styleInfo(style: CitationStyle): StyleInfo {
  return CITATION_STYLES.find((s) => s.id === style) ?? CITATION_STYLES[0];
}

/** A piece of a reference. `italic` marks journal titles and volumes, which styles italicise. */
export interface Part {
  text: string;
  italic?: boolean;
  /** A visible marker for a field the paper's metadata does not have, such as "[volume missing]". */
  gap?: boolean;
  /** The whole entry could not be formatted; `text` says why. */
  unusable?: boolean;
}

// --- Missing metadata (ADR 0006) ---------------------------------------------------------------
// Rule: never invent. A missing field is shown as a marked gap in its place, and an entry that
// lacks what a style cannot do without says so instead of rendering a malformed reference.

export type Field = "author" | "title" | "year" | "journal" | "volume" | "issue" | "page range";

/** The text shown in place of a missing field. TODO(copy): the owner rewrites this wording. */
export function gapText(field: Field): string {
  return `[${field} missing]`;
}

/** What each style cannot do without. Today all six agree; the table lets one style differ later. */
const REQUIRED_FIELDS: Record<CitationStyle, Field[]> = {
  apa: ["author", "title", "year"],
  mla: ["author", "title", "year"],
  chicago: ["author", "title", "year"],
  harvard: ["author", "title", "year"],
  ieee: ["author", "title", "year"],
  vancouver: ["author", "title", "year"],
};

const has = (value: string | number | undefined | null): boolean =>
  value !== undefined && value !== null && String(value).trim() !== "";

/** The required fields this paper lacks for the style. Empty means the entry can be formatted. */
export function missingRequired(paper: Paper, style: CitationStyle): Field[] {
  return REQUIRED_FIELDS[style].filter((field) => {
    if (field === "author") return paper.authors.length === 0;
    if (field === "title") return !has(paper.title);
    return !has(paper.year);
  });
}

/** TODO(copy): the owner rewrites this wording. */
export function unusableMessage(style: CitationStyle, missing: Field[]): string {
  return `TODO(copy): This reference cannot be formatted in ${styleInfo(style).label}. Missing: ${missing.join(", ")}.`;
}

/** A field's value as a part, or a marked gap when it is missing. */
function field(
  value: string | undefined,
  name: Field,
  opts: { italic?: boolean; format?: (v: string) => string } = {},
): Part {
  if (!has(value)) return { text: gapText(name), gap: true };
  const text = opts.format ? opts.format(value!.trim()) : value!.trim();
  return opts.italic ? { text, italic: true } : { text };
}

const plain = (text: string): Part => ({ text });

const yearText = (paper: Paper): string => (has(paper.year) ? String(paper.year) : gapText("year"));

// --- Small helpers --------------------------------------------------------------------------

/** "Aisha Marie" gives ["A", "M"]. Hyphenated given names give both parts. */
function initialLetters(given: string): string[] {
  return given
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase());
}

/** "Calloway, A. M." (APA). */
function apaName(a: Author): string {
  return `${a.family}, ${initialLetters(a.given)
    .map((i) => `${i}.`)
    .join(" ")}`;
}

/** "Calloway, A.M." (Harvard). */
function harvardName(a: Author): string {
  return `${a.family}, ${initialLetters(a.given)
    .map((i) => `${i}.`)
    .join("")}`;
}

/** "Calloway AM" (Vancouver). */
function vancouverName(a: Author): string {
  return `${a.family} ${initialLetters(a.given).join("")}`;
}

/** "A. M. Calloway" (IEEE). */
function ieeeName(a: Author): string {
  return `${initialLetters(a.given)
    .map((i) => `${i}.`)
    .join(" ")} ${a.family}`;
}

/** "Calloway, Aisha Marie" (inverted full name, first author in MLA and Chicago). */
function invertedName(a: Author): string {
  return `${a.family}, ${a.given}`;
}

/** "Chidi Mbeki" (natural order, later authors in MLA and Chicago). */
function naturalName(a: Author): string {
  return `${a.given} ${a.family}`;
}

/**
 * Sentence case: lowercase everything, then capitalise the first letter and the first letter
 * after a colon. Limitation: it cannot know proper nouns, so "london" would stay lowercase.
 */
export function sentenceCase(title: string): string {
  const lower = title.trim().toLowerCase();
  return lower.replace(
    /(^|:\s+)([a-z])/g,
    (_m, lead: string, ch: string) => lead + ch.toUpperCase(),
  );
}

/**
 * Shortens the end of a page range to its changing digits, as Chicago and Vancouver do:
 * "412–429" becomes "412–29". Ranges that cannot be shortened are returned unchanged.
 */
export function abbreviateRange(range: string, dash: string): string {
  const [from, to] = range.split(/[–-]/);
  // Round hundreds keep full numbers ("100–112"), as do ranges that cannot be shortened.
  if (!from || !to || to.length < from.length || from.endsWith("00")) {
    return range.replace(/[–-]/, dash);
  }
  let i = 0;
  while (i < from.length - 2 && from[i] === to[i]) i += 1;
  return `${from}${dash}${to.slice(i)}`;
}

function joinWithAnd(names: string[], and: string, oxford: boolean): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} ${and} ${names[1]}`;
  const head = names.slice(0, -1).join(", ");
  return `${head}${oxford ? "," : ""} ${and} ${names[names.length - 1]}`;
}

/** Family names for in-text use, according to how many authors each style lists. */
function familyNames(
  authors: Author[],
  opts: { and: string; oxford: boolean; listUpTo: number },
): string {
  const families = authors.map((a) => a.family);
  if (families.length === 0) return gapText("author");
  if (families.length > opts.listUpTo) return `${families[0]} et al.`;
  return joinWithAnd(families, opts.and, opts.oxford);
}

// --- In-text citations (what a citation chip says) -------------------------------------------

/**
 * The text of a citation chip, for example "Calloway et al., 2023, p. 4" in APA.
 * `number` is the paper's place in the reference list; only the numbered styles use it.
 */
export function inTextLabel(
  paper: Paper,
  page: number,
  style: CitationStyle,
  number: number,
): string {
  const year = yearText(paper);
  switch (style) {
    case "apa":
      return `${familyNames(paper.authors, { and: "&", oxford: false, listUpTo: 2 })}, ${year}, p. ${page}`;
    case "mla":
      return `${familyNames(paper.authors, { and: "and", oxford: false, listUpTo: 2 })} ${page}`;
    case "chicago":
      return `${familyNames(paper.authors, { and: "and", oxford: true, listUpTo: 3 })} ${year}, ${page}`;
    case "harvard":
      return `${familyNames(paper.authors, { and: "and", oxford: false, listUpTo: 3 })}, ${year}, p. ${page}`;
    case "ieee":
      return `[${number}, p. ${page}]`;
    case "vancouver":
      return `(${number}, p. ${page})`;
  }
}

/** How a paper is named in lists and headers, for example "Calloway et al., 2023". */
export function shortName(paper: Paper, style: CitationStyle): string {
  if (style === "mla") {
    return familyNames(paper.authors, { and: "and", oxford: false, listUpTo: 2 });
  }
  const opts =
    style === "chicago" || style === "harvard"
      ? { and: "and", oxford: style === "chicago", listUpTo: 3 }
      : { and: "&", oxford: false, listUpTo: 2 };
  return `${familyNames(paper.authors, opts)}, ${yearText(paper)}`;
}

// --- Reference list entries ------------------------------------------------------------------

function mlaAuthors(authors: Author[]): string {
  if (authors.length === 1) return `${invertedName(authors[0])}.`;
  if (authors.length === 2) return `${invertedName(authors[0])}, and ${naturalName(authors[1])}.`;
  return `${invertedName(authors[0])}, et al.`;
}

function chicagoAuthors(authors: Author[]): string {
  const [first, ...rest] = authors;
  const names = [invertedName(first), ...rest.map(naturalName)];
  if (names.length === 1) return `${names[0]}`;
  if (names.length === 2) return `${names[0]}, and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function apaAuthors(authors: Author[]): string {
  const names = authors.map(apaName);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, & ${names[names.length - 1]}`;
}

/**
 * The full reference-list entry for a paper, as parts so journals and volumes can be italic and
 * gaps can be marked. The same parts are shown on screen and copied, so the two cannot differ.
 * Missing journal, volume, issue or page range appear as visible gaps in their place; a paper
 * missing an author, title or year gives a single part saying it cannot be formatted.
 */
export function referenceParts(paper: Paper, style: CitationStyle, number: number): Part[] {
  const missing = missingRequired(paper, style);
  if (missing.length > 0) return [{ text: unusableMessage(style, missing), unusable: true }];

  const year = String(paper.year).trim();
  const journal = field(paper.journal, "journal", { italic: true });
  const volume = (italic: boolean) => field(paper.volume, "volume", { italic });
  const issue = field(paper.issue, "issue");
  const pages = (dash: string | null) =>
    field(paper.articlePages, "page range", {
      format: dash === null ? undefined : (v) => abbreviateRange(v, dash),
    });

  switch (style) {
    case "apa":
      return [
        plain(`${apaAuthors(paper.authors)} (${year}). ${sentenceCase(paper.title)}. `),
        journal,
        plain(", "),
        volume(true),
        plain("("),
        issue,
        plain("), "),
        pages(null),
        plain("."),
      ];
    case "mla":
      return [
        plain(`${mlaAuthors(paper.authors)} “${paper.title}.” `),
        journal,
        plain(", vol. "),
        volume(false),
        plain(", no. "),
        issue,
        plain(`, ${year}, pp. `),
        pages(null),
        plain("."),
      ];
    case "chicago":
      return [
        plain(`${chicagoAuthors(paper.authors)}. ${year}. “${paper.title}.” `),
        journal,
        plain(" "),
        volume(false),
        plain(" ("),
        issue,
        plain("): "),
        pages("–"),
        plain("."),
      ];
    case "harvard":
      return [
        plain(
          `${joinWithAnd(paper.authors.map(harvardName), "and", false)} (${year}) ‘${sentenceCase(paper.title)}’, `,
        ),
        journal,
        plain(", "),
        volume(false),
        plain("("),
        issue,
        plain("), pp. "),
        pages(null),
        plain("."),
      ];
    case "ieee":
      return [
        plain(
          `[${number}] ${joinWithAnd(paper.authors.map(ieeeName), "and", true)}, “${sentenceCase(paper.title)},” `,
        ),
        journal,
        plain(", vol. "),
        volume(false),
        plain(", no. "),
        issue,
        plain(", pp. "),
        pages(null),
        plain(`, ${year}.`),
      ];
    case "vancouver":
      return [
        plain(
          `${number}. ${paper.authors.map(vancouverName).join(", ")}. ${sentenceCase(paper.title)}. `,
        ),
        journal,
        plain(`. ${year};`),
        volume(false),
        plain("("),
        issue,
        plain("):"),
        pages("-"),
        plain("."),
      ];
  }
}

/** The same entry as plain text, for copying: exactly what is displayed, gaps included. */
export function referenceText(paper: Paper, style: CitationStyle, number: number): string {
  return referenceParts(paper, style, number)
    .map((p) => p.text)
    .join("");
}

// --- Whole answers ---------------------------------------------------------------------------

/**
 * The papers an answer cites, in the order the reference list should show them: first-cited first
 * for numbered styles, alphabetical by first author for the others. Each gets its number.
 */
export function referenceOrder(
  answer: AnswerData,
  passagePaperId: (passageId: string) => string | undefined,
  papers: Paper[],
  style: CitationStyle,
): { paper: Paper; number: number }[] {
  const firstCited: string[] = [];
  for (const sentence of answer.sentences) {
    for (const passageId of sentence.citations) {
      const paperId = passagePaperId(passageId);
      if (paperId && !firstCited.includes(paperId)) firstCited.push(paperId);
    }
  }
  const numberOf = (id: string) => firstCited.indexOf(id) + 1;
  const cited = firstCited
    .map((id) => papers.find((p) => p.id === id))
    .filter((p): p is Paper => p !== undefined)
    .map((paper) => ({ paper, number: numberOf(paper.id) }));
  if (styleInfo(style).kind === "numbered") return cited;
  return [...cited].sort((a, b) =>
    (a.paper.authors[0]?.family ?? "").localeCompare(b.paper.authors[0]?.family ?? ""),
  );
}
