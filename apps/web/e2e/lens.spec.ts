import { expect, test, type Page } from "@playwright/test";

// The lens demo on /design: an answer on the left, its source sheet on the right.
const answerChip = (page: Page, label: string) =>
  page
    .locator("article", { hasText: "Does irregular sleep affect attention" })
    .locator("button[data-citation-chip]", { hasText: label });
const passage = (page: Page, id: string) =>
  page.getByRole("region", { name: "Source passages" }).locator(`[data-passage-id="${id}"]`);

test.describe("the lens", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/design");
    await page.evaluate(() => document.fonts.ready);
  });

  test("choosing a chip focuses its passage and dims the others", async ({ page }) => {
    await answerChip(page, "Calloway et al., 2023, p. 7").click();
    await expect(passage(page, "s2")).toHaveAttribute("data-lens-state", "focused");
    await expect(passage(page, "s1")).toHaveAttribute("data-lens-state", "dimmed");
    // The highlight is the yellow token (#FFE14D) once the short animation has finished.
    await expect(passage(page, "s2").locator("mark")).toHaveCSS(
      "background-color",
      "rgb(255, 225, 77)",
    );
    await expect(passage(page, "s1").locator("blockquote")).toHaveCSS("opacity", "0.65");
  });

  test("the source sheet scrolls so the passage is visible", async ({ page }) => {
    await answerChip(page, "Calloway et al., 2023, p. 11").click();
    const box = await passage(page, "s4").boundingBox();
    const sheet = await page.getByRole("region", { name: "Source passages" }).boundingBox();
    expect(box && sheet).toBeTruthy();
    await expect
      .poll(async () => {
        const b = await passage(page, "s4").boundingBox();
        return !!b && !!sheet && b.y >= sheet.y && b.y + b.height <= sheet.y + sheet.height + 1;
      })
      .toBe(true);
  });

  test("Tab to a chip, Enter chooses it, Escape clears it", async ({ page }) => {
    const chip = answerChip(page, "Hartigan et al., 2022, p. 3");
    await chip.focus();
    await page.keyboard.press("Enter");
    await expect(passage(page, "s3")).toHaveAttribute("data-lens-state", "focused");
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(passage(page, "s3")).toHaveAttribute("data-lens-state", "idle");
    await expect(passage(page, "s1")).toHaveAttribute("data-lens-state", "idle");
  });

  test("with reduced motion the change is instant", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/design");
    await answerChip(page, "Calloway et al., 2023, p. 7").click();
    // No waiting: the highlight is already fully yellow on the next frame.
    await expect(passage(page, "s2").locator("mark")).toHaveCSS(
      "background-color",
      "rgb(255, 225, 77)",
      {
        timeout: 100,
      },
    );
    await context.close();
  });
});
