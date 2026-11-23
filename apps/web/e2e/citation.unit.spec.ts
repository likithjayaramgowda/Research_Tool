import { expect, test } from "@playwright/test";

import {
  abbreviateRange,
  gapText,
  inTextLabel,
  isCitationStyle,
  missingRequired,
  referenceOrder,
  referenceParts,
  referenceText,
  sentenceCase,
  shortName,
} from "../src/lib/citation";
import { answer, papers, passageById } from "../src/lib/fixtures";
import type { CitationStyle, Paper } from "../src/lib/types";

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

// --- Missing metadata (ADR 0006): render what is known, mark gaps, never invent ----------------

const STYLE_IDS: CitationStyle[] = ["apa", "mla", "chicago", "harvard", "ieee", "vancouver"];
const noDetails: Paper = {
  ...papers[0],
  volume: undefined,
  issue: undefined,
  articlePages: undefined,
};

test.describe("references with missing volume, issue and page range", () => {
  const expected: Record<CitationStyle, string> = {
    apa: "Calloway, A. M., Mbeki, C., & Trenholm, D. (2023). Sleep regularity and attention lapses in rotating-shift workers. Journal of Shift Work Research, [volume missing]([issue missing]), [page range missing].",
    mla: "Calloway, Aisha Marie, et al. “Sleep Regularity and Attention Lapses in Rotating-Shift Workers.” Journal of Shift Work Research, vol. [volume missing], no. [issue missing], 2023, pp. [page range missing].",
    chicago:
      "Calloway, Aisha Marie, Chidi Mbeki, and Dara Trenholm. 2023. “Sleep Regularity and Attention Lapses in Rotating-Shift Workers.” Journal of Shift Work Research [volume missing] ([issue missing]): [page range missing].",
    harvard:
      "Calloway, A.M., Mbeki, C. and Trenholm, D. (2023) ‘Sleep regularity and attention lapses in rotating-shift workers’, Journal of Shift Work Research, [volume missing]([issue missing]), pp. [page range missing].",
    ieee: "[1] A. M. Calloway, C. Mbeki, and D. Trenholm, “Sleep regularity and attention lapses in rotating-shift workers,” Journal of Shift Work Research, vol. [volume missing], no. [issue missing], pp. [page range missing], 2023.",
    vancouver:
      "1. Calloway AM, Mbeki C, Trenholm D. Sleep regularity and attention lapses in rotating-shift workers. Journal of Shift Work Research. 2023;[volume missing]([issue missing]):[page range missing].",
  };
  for (const style of STYLE_IDS) {
    test(`${style}: known parts are kept and each gap is marked in place`, () => {
      expect(referenceText(noDetails, style, 1)).toBe(expected[style]);
    });
    test(`${style}: exactly the three gaps are flagged, and nothing else`, () => {
      const parts = referenceParts(noDetails, style, 1);
      expect(parts.filter((p) => p.gap).map((p) => p.text)).toEqual([
        gapText("volume"),
        gapText("issue"),
        gapText("page range"),
      ]);
      expect(parts.some((p) => p.unusable)).toBe(false);
    });
  }
});

test.describe("complete references have no gaps in any style", () => {
  for (const style of STYLE_IDS) {
    test(style, () => {
      const parts = referenceParts(threeAuthors, style, 1);
      expect(parts.some((p) => p.gap || p.unusable)).toBe(false);
      expect(referenceText(threeAuthors, style, 1)).not.toContain("missing");
    });
  }
});

test.describe("a missing journal, or only some details, is also marked", () => {
  test("missing journal is a gap, not a guess", () => {
    const text = referenceText({ ...threeAuthors, journal: undefined }, "apa", 1);
    expect(text).toContain("workers. [journal missing], 14(2), 412–429.");
  });
  test("a known volume stays while an unknown issue is marked", () => {
    const text = referenceText({ ...threeAuthors, issue: undefined }, "mla", 1);
    expect(text).toContain("vol. 14, no. [issue missing], 2023");
  });
  test("blank and whitespace-only values count as missing", () => {
    const text = referenceText({ ...threeAuthors, volume: "  ", issue: "" }, "ieee", 1);
    expect(text).toContain("vol. [volume missing], no. [issue missing]");
  });
  test("a gap is never italic, and the journal and volume still are when present", () => {
    const parts = referenceParts({ ...threeAuthors, journal: undefined }, "apa", 1);
    expect(parts.find((p) => p.gap)?.italic).toBeUndefined();
    const full = referenceParts(threeAuthors, "apa", 1);
    expect(full.filter((p) => p.italic).map((p) => p.text)).toEqual([
      "Journal of Shift Work Research",
      "14",
    ]);
  });
  test("page ranges are only shortened when there is one", () => {
    expect(referenceText({ ...threeAuthors, articlePages: undefined }, "chicago", 1)).toContain(
      "(2): [page range missing].",
    );
    expect(referenceText(threeAuthors, "vancouver", 1)).toContain("412-29");
  });
});

test.describe("a reference missing what a style cannot do without says so", () => {
  const noAuthors: Paper = { ...threeAuthors, authors: [] };
  const noYear: Paper = { ...threeAuthors, year: undefined };
  const noTitle: Paper = { ...threeAuthors, title: "  " };
  for (const style of STYLE_IDS) {
    test(`${style}: no authors, no year or no title gives one plain message`, () => {
      for (const [paper, field] of [
        [noAuthors, "author"],
        [noYear, "year"],
        [noTitle, "title"],
      ] as const) {
        const parts = referenceParts(paper, style, 1);
        expect(parts).toHaveLength(1);
        expect(parts[0].unusable).toBe(true);
        expect(parts[0].text).toContain("cannot be formatted");
        expect(parts[0].text).toContain(`Missing: ${field}.`);
        // Not a malformed entry: none of the entry's own punctuation or numbering is there.
        expect(parts[0].text).not.toContain("Journal of Shift Work Research");
      }
    });
  }
  test("several missing fields are all listed", () => {
    const text = referenceText({ ...threeAuthors, authors: [], year: undefined }, "apa", 1);
    expect(text).toContain("Missing: author, year.");
  });
  test("missingRequired says what is lacking, and nothing for a complete paper", () => {
    expect(missingRequired(noAuthors, "mla")).toEqual(["author"]);
    expect(missingRequired(threeAuthors, "mla")).toEqual([]);
    expect(missingRequired(noDetails, "apa")).toEqual([]); // volume, issue, pages degrade instead
  });
});

test.describe("labels and names never invent a year or an author", () => {
  test("a missing year is marked in chips and short names", () => {
    const paper: Paper = { ...threeAuthors, year: undefined };
    expect(inTextLabel(paper, 4, "apa", 1)).toBe("Calloway et al., [year missing], p. 4");
    expect(inTextLabel(paper, 4, "chicago", 1)).toContain("[year missing]");
    expect(shortName(paper, "apa")).toBe("Calloway et al., [year missing]");
    expect(shortName(paper, "mla")).toBe("Calloway et al."); // MLA short names have no year
  });
  test("missing authors are marked, never replaced with a guess", () => {
    const paper: Paper = { ...threeAuthors, authors: [] };
    expect(inTextLabel(paper, 4, "apa", 1)).toBe("[author missing], 2023, p. 4");
    expect(shortName(paper, "harvard")).toBe("[author missing], 2023");
  });
  test("nothing like n.d. or Anonymous ever appears", () => {
    const bare: Paper = { ...threeAuthors, authors: [], year: undefined, journal: undefined };
    for (const style of STYLE_IDS) {
      const text = `${referenceText(bare, style, 1)} ${inTextLabel(bare, 1, style, 1)}`;
      expect(text).not.toMatch(/n\.d\.|anonymous|unknown/i);
    }
  });
});

test("the copied text is the displayed text: one function feeds both", () => {
  for (const style of STYLE_IDS) {
    for (const paper of [threeAuthors, noDetails, { ...threeAuthors, authors: [] }]) {
      const shown = referenceParts(paper, style, 2)
        .map((p) => p.text)
        .join("");
      expect(referenceText(paper, style, 2)).toBe(shown);
    }
  }
});
