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

export interface Paper {
  id: string;
  title: string;
  /** For example "Calloway, Mbeki and Trenholm". */
  authors: string;
  /** Short label used in citation chips, for example "Calloway 2023". */
  short: string;
  year: number;
  pages: number;
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
