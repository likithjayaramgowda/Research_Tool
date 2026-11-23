import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Pages are checked closed in pages.spec.ts. Here we check the things that open on top of them.
async function noSeriousIssues(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    bad.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`),
  ).toEqual([]);
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`open overlays, ${scheme}`, () => {
    test.use({ colorScheme: scheme, reducedMotion: "reduce" });

    test("citation style menu (wide)", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/demo");
      await page.getByRole("button", { name: /^Citations:/ }).click();
      await expect(page.getByRole("menuitemradio", { name: /IEEE/ })).toBeVisible();
      await noSeriousIssues(page);
    });

    test("library drawer (phone)", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/demo");
      await page.getByRole("button", { name: "Library", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "Library" })).toBeVisible();
      await noSeriousIssues(page);
    });

    test("source bottom sheet with a passage in focus (phone)", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/demo");
      await page
        .locator("#conversation")
        .getByRole("button", { name: "Source: Calloway et al., 2023, p. 4" })
        .click();
      await expect(page.getByRole("dialog", { name: "Source" })).toBeVisible();
      await noSeriousIssues(page);
    });

    test("paper cards and gaps tabs (wide)", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/demo");
      await page.getByRole("tab", { name: "Paper cards" }).click();
      await noSeriousIssues(page);
      await page.getByRole("tab", { name: "Gaps" }).click();
      await noSeriousIssues(page);
    });

    test("hero lens after it has played (wide)", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/");
      await expect(
        page.getByRole("region", { name: "Source passages" }).locator('[data-passage-id="s1"]'),
      ).toHaveAttribute("data-lens-state", "focused", { timeout: 3000 });
      await noSeriousIssues(page);
    });
  });
}
