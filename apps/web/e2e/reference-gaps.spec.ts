import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 900 } });

test("missing metadata shows as marked gaps, and Copy references copies exactly what is shown", async ({
  browser,
}) => {
  const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage();
  await page.goto("/design");

  // The specimen: one paper missing volume, issue and pages; one missing its year.
  const specimen = page.locator("article", { has: page.locator("[data-reference-gap]") });
  const entries = specimen.locator("[data-reference]");
  await expect(entries).toHaveCount(2);

  const gaps = entries.first().locator("[data-reference-gap]");
  await expect(gaps).toHaveText(["[volume missing]", "[issue missing]", "[page range missing]"]);
  await expect(gaps.first()).toBeVisible();

  // The second cannot be formatted, and says so instead of showing a malformed entry.
  await expect(entries.nth(1)).toContainText("cannot be formatted in APA 7");
  await expect(entries.nth(1)).toContainText("Missing: year.");
  await expect(entries.nth(1)).not.toContainText("Journal");

  // Copy: the clipboard holds exactly the displayed text, gaps included.
  const shown = (await entries.allTextContents()).join("\n");
  await specimen.getByRole("button", { name: /Copy references/ }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(shown);
  expect(copied).toContain("[volume missing]([issue missing]), [page range missing].");
  await context.close();
});

test("the demo answer, which has complete metadata, shows no gaps", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.locator("[data-reference]").first()).toBeVisible();
  await expect(page.locator("[data-reference-gap]")).toHaveCount(0);
});
