/**
 * Sample data for slice 0.2. Every paper, author and finding below is invented.
 * Slice 2.6 replaces this file with real data from the API.
 */
import type { AnswerData, Paper, Passage } from "./types";

export const papers: Paper[] = [
  {
    id: "p1",
    title: "Sleep Regularity and Attention Lapses in Rotating-Shift Workers",
    authors: "Calloway, Mbeki and Trenholm",
    short: "Calloway 2023",
    year: 2023,
    pages: 18,
    status: "ready",
    card: {
      question: "Does an irregular sleep schedule affect attention, independent of sleep length?",
      method:
        "Observational study. Participants wore sleep trackers for four weeks and did a vigilance task each day.",
      data: "212 hospital nurses on rotating shifts, recruited from six wards.",
      findings:
        "Bedtimes that varied by more than ninety minutes went with 31% more attention errors, even after adjusting for total sleep time.",
      limitations:
        "Only nurses took part, and attention was measured with one task. Cause and effect cannot be separated.",
    },
  },
  {
    id: "p2",
    title: "Timed Light Exposure and Circadian Drift: A Six-Week Field Trial",
    authors: "Hartigan, Pellerin and Oyelaran",
    short: "Hartigan 2022",
    year: 2022,
    pages: 24,
    status: "ready",
    card: {
      question: "Can timed bright light keep the body clock aligned for people who rotate shifts?",
      method:
        "Randomised field trial over six weeks, with a bright-light group and a control group.",
      data: "96 warehouse and transport workers. A saliva marker was collected twice a week.",
      findings:
        "Drift in the clock marker was largest in workers who rotated more than twice a month. Timed light reduced drift by about a third.",
      limitations: "Attention and performance were not measured. The trial was short.",
    },
  },
  {
    id: "p3",
    title: "Short Naps as a Night-Shift Fatigue Countermeasure",
    authors: "Ostrander and Veeran",
    short: "Ostrander 2020",
    year: 2020,
    pages: 12,
    status: "reading",
    progress: 62,
  },
];

export const passages: Passage[] = [
  {
    id: "s1",
    paperId: "p1",
    page: 4,
    text: "Participants whose bedtimes varied by more than ninety minutes across the week made 31% more attention errors on the vigilance task than participants with regular bedtimes.",
  },
  {
    id: "s2",
    paperId: "p1",
    page: 7,
    text: "The effect held after adjusting for total sleep time, which suggests that regularity matters independently of how long people sleep.",
  },
  {
    id: "s3",
    paperId: "p2",
    page: 3,
    text: "Drift in the circadian marker was largest in workers who rotated shifts more than twice a month, and smallest in those who stayed on one shift.",
  },
  {
    id: "s4",
    paperId: "p1",
    page: 11,
    text: "All participants were hospital nurses, so these findings may not generalise to other occupations or to workers on different schedules.",
  },
  {
    id: "s5",
    paperId: "p2",
    page: 9,
    text: "The trial did not measure attention or task performance directly; the clock marker is a proxy for how well the body clock is aligned.",
  },
];

export const answer: AnswerData = {
  id: "a1",
  question: "Does irregular sleep affect attention in shift workers?",
  sentences: [
    {
      id: "a1-1",
      text: "Shift workers whose bedtimes varied widely made about 31% more attention errors than those with regular bedtimes.",
      citations: ["s1"],
    },
    {
      id: "a1-2",
      text: "This held after accounting for how long they slept, so regularity appears to matter on its own.",
      citations: ["s2"],
    },
    {
      id: "a1-3",
      text: "Rotating shifts often also seems to push the body clock further out of step, although that study did not test attention.",
      citations: ["s3", "s5"],
    },
    {
      id: "a1-4",
      text: "The attention results come only from hospital nurses, so they may not apply to other jobs.",
      citations: ["s4"],
    },
  ],
};

export const paperById = (id: string): Paper | undefined => papers.find((p) => p.id === id);
export const passageById = (id: string): Passage | undefined => passages.find((p) => p.id === id);

/** The text a citation chip shows, for example "Calloway 2023, p. 4". */
export function chipLabel(passage: Passage): string {
  const paper = paperById(passage.paperId);
  return `${paper?.short ?? "Unknown"}, p. ${passage.page}`;
}
