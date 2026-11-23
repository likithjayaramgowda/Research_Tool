import { expect, test, type Page } from "@playwright/test";

const STYLES = [/APA 7/, /MLA 9/, /Chicago/, /Harvard/, /IEEE/, /Vancouver/];

async function chooseStyle(page: Page, name: RegExp) {
  await page.getByRole("button", { name: /^Citations:/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
  await expect(page.getByRole("menu")).toBeHidden();
}

/**
 * For every chip in the answer paragraph, reports whether it is the first thing on its visual
 * line. A chip may only start a line when it directly follows another chip of the same sentence
 * (two long APA chips cannot share one 390px line); the first chip of a sentence never may.
 */
async function chipsStartingALine(page: Page) {
  return page.evaluate(() => {
    const out: { text: string; sentence: string | null; afterSiblingChip: boolean }[] = [];
    for (const chip of document.querySelectorAll<HTMLElement>(
      "p.reading button[data-citation-chip]",
    )) {
      const para = chip.closest("p")!;
      const rect = chip.getBoundingClientRect();
      // The text just before the chip: the end of the previous glyph must be on the same line.
      const range = document.createRange();
      range.setStartBefore(para.firstChild!);
      range.setEndBefore(chip);
      const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0);
      const last = rects[rects.length - 1];
      const sameLine =
        last &&
        Math.abs(last.top + last.height / 2 - (rect.top + rect.height / 2)) < rect.height / 2;
      if (!sameLine) {
        const prev = chip.parentElement?.previousElementSibling ?? chip.previousElementSibling;
        out.push({
          text: chip.textContent ?? "",
          sentence: chip.getAttribute("data-cites"),
          afterSiblingChip:
            !!prev?.querySelector("[data-citation-chip]") ||
            prev?.matches("[data-citation-chip]") === true,
        });
      }
    }
    return out;
  });
}

for (const width of [390, 1280]) {
  test.describe(`chips are bound to their sentence at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    for (const style of STYLES) {
      test(`${style.source}`, async ({ page }) => {
        await page.goto("/demo");
        await chooseStyle(page, style);
        await page.evaluate(() => document.fonts.ready);
        const starters = await chipsStartingALine(page);
        // The first chip of a sentence never starts a line.
        const firstChips = starters.filter((s) => !s.afterSiblingChip);
        expect(firstChips, JSON.stringify(starters)).toEqual([]);
      });
    }
  });
}

test("every chip names its sentence and is a button with a source name", async ({ page }) => {
  await page.goto("/demo");
  const chips = page.locator("p.reading button[data-citation-chip]");
  await expect(chips).toHaveCount(5);
  for (const chip of await chips.all()) {
    const sentence = await chip.getAttribute("data-cites");
    expect(sentence).toMatch(/^a1-\d$/);
    await expect(chip.locator("xpath=ancestor::span[@data-sentence-id]")).toHaveAttribute(
      "data-sentence-id",
      sentence!,
    );
  }
  await expect(
    page.getByRole("button", { name: "Source: Calloway et al., 2023, p. 4" }),
  ).toBeVisible();
});

test("hovering a chip tints its sentence, not with the highlighter", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/demo");
  const sentence = page.locator('[data-sentence-id="a1-1"]');
  const before = await sentence.evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.getByRole("button", { name: "Source: Calloway et al., 2023, p. 4" }).hover();
  const after = await sentence.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(after).not.toBe(before);
  expect(after).not.toContain("255, 225, 77");
  // Keyboard focus does the same.
  await page.mouse.move(0, 0);
  await page.getByRole("button", { name: "Source: Calloway et al., 2023, p. 7" }).focus();
  await page.keyboard.press("Tab"); // move on, then back with the keyboard so :focus-visible applies
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator('[data-sentence-id="a1-2"]')).not.toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
});
