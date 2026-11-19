/** Shapes shared by the LitLens components. Slice 2.6 will fill these from the real API. */

export type PaperStatus = "uploading" | "reading" | "ready" | "failed";

/** The five fields of a paper card. */
export interface PaperCardData {
  question: string;
  method: string;
  data: string;
  findings: string;
  limitations: string;
}

/** One author, kept as structured data so every citation style can format it. */
export interface Author {
  family: string;
  given: string;
}

/** The citation styles LitLens can format into. */
export type CitationStyle = "apa" | "mla" | "chicago" | "harvard" | "ieee" | "vancouver";

export interface Paper {
  id: string;
  /** As printed on the paper, in title case. Styles that want sentence case convert it. */
  title: string;
  authors: Author[];
  year: number;
  journal: string;
  volume: string;
  issue: string;
  /** Page range in the journal, with an en dash, for example "412–429". */
  articlePages: string;
  /** Number of pages in the uploaded PDF. */
  pageCount: number;
  status: PaperStatus;
  /** 0 to 100, only meaningful while uploading or reading. */
  progress?: number;
  card?: PaperCardData;
}

/** A passage of text in a paper that an answer can cite. */
export interface Passage {
  id: string;
  paperId: string;
  page: number;
  text: string;
}

export interface AnswerSentence {
  id: string;
  text: string;
  /** Passage ids. Every sentence in an answer has at least one. */
  citations: string[];
}

export interface AnswerData {
  id: string;
  question: string;
  sentences: AnswerSentence[];
}

/** One row of the comparison table: a paper's headline facts. */
export interface ComparisonRow {
  paperId: string;
  design: string;
  sample: string;
  duration: string;
  finding: string;
}

export type GapStatus = "studied" | "partly" | "not-studied";

/** One part of the student's idea, and whether each paper covers it. */
export interface GapRow {
  aspect: string;
  /** Keyed by paper id. */
  cells: Record<string, GapStatus>;
}

export interface GapCheckData {
  /** The student's own research idea, in their words. */
  idea: string;
  paperIds: string[];
  rows: GapRow[];
}
