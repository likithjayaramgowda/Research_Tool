import { expect, test, type Page } from "@playwright/test";

const passage = (page: Page, id: string) =>
  page.getByRole("region", { name: "Source passages" }).locator(`[data-passage-id="${id}"]`);

test.describe("landing page hero", () => {
  test("the example plays once on its own, then waits", async ({ page }) => {
    await page.goto("/");
    // Before it plays, nothing is focused.
    await expect(passage(page, "s1")).toHaveAttribute("data-lens-state", "idle");
    // Then the first citation brings its passage into focus.
    await expect(passage(page, "s1")).toHaveAttribute("data-lens-state", "focused", {
      timeout: 3000,
    });
    await expect(passage(page, "s2")).toHaveAttribute("data-lens-state", "dimmed");
    // It does not keep going: it stays put.
    await page.waitForTimeout(1500);
    await expect(passage(page, "s1")).toHaveAttribute("data-lens-state", "focused");
  });

  test("the visitor can take over by choosing the other chip", async ({ page }) => {
    await page.goto("/");
    await expect(passage(page, "s1")).toHaveAttribute("data-lens-state", "focused", {
      timeout: 3000,
    });
    await page.getByRole("button", { name: "Source: Calloway et al., 2023, p. 7" }).click();
    await expect(passage(page, "s2")).toHaveAttribute("data-lens-state", "focused");
    await expect(passage(page, "s1")).toHaveAttribute("data-lens-state", "dimmed");
  });

  test("a visitor who chooses first is not overridden by the autoplay", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Source: Calloway et al., 2023, p. 7" }).click();
    await page.waitForTimeout(1800);
    await expect(passage(page, "s2")).toHaveAttribute("data-lens-state", "focused");
  });

  test("the two buttons and the footer point where they should", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Try the demo" })).toHaveAttribute("href", "/demo");
    await expect(page.getByRole("link", { name: "Sign in with Google" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
    await expect(page.getByText("Built by Likith Jayaram Gowda")).toBeVisible();
    await expect(page.getByRole("link", { name: "Source code on GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/likithjayaramgowda/Research_Tool",
    );
    await expect(
      page.getByRole("contentinfo").getByRole("link", { name: "How it works" }),
    ).toHaveAttribute("href", "/#how-it-works");
  });

  test("the hero says what the brief says", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Ask your papers. See exactly where each answer comes from.",
    );
    await expect(
      page.getByText(
        "Upload up to 30 papers. LitLens answers only from them, cites the page for every sentence, and tells you when the answer isn't there.",
      ),
    ).toBeVisible();
  });
});
