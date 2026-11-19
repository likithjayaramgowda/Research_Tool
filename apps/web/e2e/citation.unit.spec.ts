import { expect, test } from "@playwright/test";

import {
  abbreviateRange,
  inTextLabel,
  isCitationStyle,
  referenceOrder,
  referenceText,
  sentenceCase,
  shortName,
} from "../src/lib/citation";
import { answer, papers, passageById } from "../src/lib/fixtures";

// These test the pure formatting functions directly: no browser involved.
const threeAuthors = papers[0]; // Calloway, Mbeki and Trenholm
const TWO = papers[2]; // Ostrander and Veeran

test.describe("sentenceCase", () => {
  test("keeps the first letter and the first letter after a colon", () => {
    expect(sentenceCase("Timed Light Exposure and Circadian Drift: A Six-Week Field Trial")).toBe(
      "Timed light exposure and circadian drift: A six-week field trial",
    );
  });
});

test.describe("abbreviateRange", () => {
  test("shortens to the changing digits", () => {
    expect(abbreviateRange("412–429", "–")).toBe("412–29");
    expect(abbreviateRange("201–224", "-")).toBe("201-24");
    expect(abbreviateRange("88–99", "–")).toBe("88–99");
  });
  test("keeps full numbers for round hundreds", () => {
    expect(abbreviateRange("100–112", "–")).toBe("100–112");
  });
});

test.describe("in-text labels, three authors, page 4", () => {
  const label = (style: Parameters<typeof inTextLabel>[2]) =>
    inTextLabel(threeAuthors, 4, style, 1);
  test("APA", () => expect(label("apa")).toBe("Calloway et al., 2023, p. 4"));
  test("MLA", () => expect(label("mla")).toBe("Calloway et al. 4"));
  test("Chicago", () => expect(label("chicago")).toBe("Calloway, Mbeki, and Trenholm 2023, 4"));
  test("Harvard", () => expect(label("harvard")).toBe("Calloway, Mbeki and Trenholm, 2023, p. 4"));
  test("IEEE", () => expect(label("ieee")).toBe("[1, p. 4]"));
  test("Vancouver", () => expect(label("vancouver")).toBe("(1, p. 4)"));
});

test.describe("in-text labels, two authors, page 2", () => {
  test("APA uses an ampersand", () => {
    expect(inTextLabel(TWO, 2, "apa", 1)).toBe("Ostrander & Veeran, 2020, p. 2");
  });
  test("MLA and Chicago use 'and'", () => {
    expect(inTextLabel(TWO, 2, "mla", 1)).toBe("Ostrander and Veeran 2");
    expect(inTextLabel(TWO, 2, "chicago", 1)).toBe("Ostrander and Veeran 2020, 2");
  });
});

test.describe("reference entries, three authors", () => {
  const ref = (style: Parameters<typeof referenceText>[1]) => referenceText(threeAuthors, style, 1);
  test("APA", () =>
    expect(ref("apa")).toBe(
      "Calloway, A. M., Mbeki, C., & Trenholm, D. (2023). Sleep regularity and attention lapses in rotating-shift workers. Journal of Shift Work Research, 14(2), 412–429.",
    ));
  test("MLA", () =>
    expect(ref("mla")).toBe(
      "Calloway, Aisha Marie, et al. “Sleep Regularity and Attention Lapses in Rotating-Shift Workers.” Journal of Shift Work Research, vol. 14, no. 2, 2023, pp. 412–429.",
    ));
  test("Chicago", () =>
    expect(ref("chicago")).toBe(
      "Calloway, Aisha Marie, Chidi Mbeki, and Dara Trenholm. 2023. “Sleep Regularity and Attention Lapses in Rotating-Shift Workers.” Journal of Shift Work Research 14 (2): 412–29.",
    ));
  test("Harvard", () =>
    expect(ref("harvard")).toBe(
      "Calloway, A.M., Mbeki, C. and Trenholm, D. (2023) ‘Sleep regularity and attention lapses in rotating-shift workers’, Journal of Shift Work Research, 14(2), pp. 412–429.",
    ));
  test("IEEE", () =>
    expect(ref("ieee")).toBe(
      "[1] A. M. Calloway, C. Mbeki, and D. Trenholm, “Sleep regularity and attention lapses in rotating-shift workers,” Journal of Shift Work Research, vol. 14, no. 2, pp. 412–429, 2023.",
    ));
  test("Vancouver", () =>
    expect(ref("vancouver")).toBe(
      "1. Calloway AM, Mbeki C, Trenholm D. Sleep regularity and attention lapses in rotating-shift workers. Journal of Shift Work Research. 2023;14(2):412-29.",
    ));
});

test.describe("reference entries, two authors", () => {
  test("APA puts a comma before the ampersand", () => {
    expect(referenceText(TWO, "apa", 1)).toContain("Ostrander, M., & Veeran, K. (2020).");
  });
  test("MLA and Chicago join with 'and'", () => {
    expect(referenceText(TWO, "mla", 1)).toMatch(/^Ostrander, Marta, and Kiran Veeran\. “/);
    expect(referenceText(TWO, "chicago", 1)).toMatch(
      /^Ostrander, Marta, and Kiran Veeran\. 2020\./,
    );
  });
  test("IEEE has no comma before 'and' for two authors", () => {
    expect(referenceText(TWO, "ieee", 1)).toContain("M. Ostrander and K. Veeran, “");
  });
});

test.describe("shortName", () => {
  test("author-date styles include the year, MLA does not", () => {
    expect(shortName(threeAuthors, "apa")).toBe("Calloway et al., 2023");
    expect(shortName(threeAuthors, "chicago")).toBe("Calloway, Mbeki, and Trenholm, 2023");
    expect(shortName(threeAuthors, "mla")).toBe("Calloway et al.");
  });
});

test.describe("referenceOrder", () => {
  const passagePaper = (id: string) => passageById(id)?.paperId;
  test("numbered styles list papers in the order first cited", () => {
    const order = referenceOrder(answer, passagePaper, papers, "ieee");
    expect(order.map((o) => [o.paper.id, o.number])).toEqual([
      ["p1", 1],
      ["p2", 2],
    ]);
  });
  test("other styles sort alphabetically but keep each paper's number", () => {
    const order = referenceOrder(answer, passagePaper, papers, "apa");
    expect(order.map((o) => o.paper.authors[0].family)).toEqual(["Calloway", "Hartigan"]);
  });
  test("only papers the answer actually cites appear", () => {
    expect(referenceOrder(answer, passagePaper, papers, "apa")).toHaveLength(2);
  });
});

test("isCitationStyle recognises the six styles and nothing else", () => {
  for (const id of ["apa", "mla", "chicago", "harvard", "ieee", "vancouver"]) {
    expect(isCitationStyle(id)).toBe(true);
  }
  expect(isCitationStyle("bluebook")).toBe(false);
  expect(isCitationStyle(null)).toBe(false);
});
