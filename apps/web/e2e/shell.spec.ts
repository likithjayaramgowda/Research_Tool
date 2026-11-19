import { expect, test, type Page } from "@playwright/test";

const passage = (page: Page, id: string) =>
  page.getByRole("region", { name: "Source passages" }).locator(`[data-passage-id="${id}"]`);
const chip = (page: Page, label: string) =>
  page.locator("#conversation").getByRole("button", { name: `Show source: ${label}` });

for (const route of ["/demo", "/app"]) {
  test.describe(`${route} on a wide screen`, () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test("shows the three panes and the sample-data label", async ({ page }) => {
      await page.goto(route);
      await expect(page.getByRole("complementary", { name: "Library" })).toBeVisible();
      await expect(page.locator("#conversation")).toBeVisible();
      await expect(page.getByRole("complementary", { name: "Source" })).toBeVisible();
      await expect(page.getByText("Sample data")).toBeVisible();
      await expect(page.getByRole("tab", { name: "Answers" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Paper cards" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Gaps" })).toBeVisible();
    });

    test("the lens works here: chip, Enter, Escape", async ({ page }) => {
      await page.goto(route);
      await chip(page, "Hartigan et al., 2022, p. 3").focus();
      await page.keyboard.press("Enter");
      await expect(passage(page, "s3")).toHaveAttribute("data-lens-state", "focused");
      await expect(passage(page, "s1")).toHaveAttribute("data-lens-state", "dimmed");
      await page.keyboard.press("Escape");
      await expect(passage(page, "s3")).toHaveAttribute("data-lens-state", "idle");
    });

    test("tabs switch between answers, paper cards and gaps", async ({ page }) => {
      await page.goto(route);
      await page.getByRole("tab", { name: "Paper cards" }).click();
      await expect(
        page.getByText("Does an irregular sleep schedule affect attention"),
      ).toBeVisible();
      await page.getByRole("tab", { name: "Gaps" }).click();
      await expect(page.getByRole("heading", { name: "Gap Check" })).toBeVisible();
    });
  });
}

test.describe("/demo on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the library is a drawer", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByRole("complementary", { name: "Library" })).toBeHidden();
    await page.getByRole("button", { name: "Library", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Library" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText("Drop PDF files here")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
  });

  test("choosing a chip opens the source as a bottom sheet with the passage in focus", async ({
    page,
  }) => {
    await page.goto("/demo");
    await chip(page, "Calloway et al., 2023, p. 11").click();
    const sheet = page.getByRole("dialog", { name: "Source" });
    await expect(sheet).toBeVisible();
    await expect(passage(page, "s4")).toHaveAttribute("data-lens-state", "focused");
    await expect(passage(page, "s1")).toHaveAttribute("data-lens-state", "dimmed");
  });

  test("the Source button opens the sheet without a chip", async ({ page }) => {
    await page.goto("/demo");
    await page.getByRole("button", { name: "Source", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Source" })).toBeVisible();
  });

  test("nothing scrolls sideways", async ({ page }) => {
    await page.goto("/demo");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
