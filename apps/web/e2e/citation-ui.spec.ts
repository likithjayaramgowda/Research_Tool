import { expect, test, type Page } from "@playwright/test";

async function chooseStyle(page: Page, name: RegExp) {
  await page.getByRole("button", { name: /^Citations:/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
  await expect(page.getByRole("menu")).toBeHidden(); // it closes itself once you choose
}
const chip = (page: Page, label: string) =>
  page.locator("#conversation").getByRole("button", { name: `Show source: ${label}` });

test.describe("citation style", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("starts as APA 7", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByRole("button", { name: /Citations: APA 7/ })).toBeVisible();
    await expect(chip(page, "Calloway et al., 2023, p. 4")).toBeVisible();
    await expect(page.getByRole("heading", { name: "References" })).toBeVisible();
  });

  test("switching to MLA re-formats the chips, the list title and the entries", async ({
    page,
  }) => {
    await page.goto("/demo");
    await chooseStyle(page, /MLA 9/);
    await expect(chip(page, "Calloway et al. 4")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Works cited" })).toBeVisible();
    await expect(
      page.getByText("“Sleep Regularity and Attention Lapses in Rotating-Shift Workers.”"),
    ).toBeVisible();
  });

  test("numbered styles number the papers in the order they are cited", async ({ page }) => {
    await page.goto("/demo");
    await chooseStyle(page, /IEEE/);
    await expect(chip(page, "[1, p. 4]")).toBeVisible();
    await expect(chip(page, "[2, p. 3]")).toBeVisible();
    await expect(page.getByText("[1] A. M. Calloway, C. Mbeki, and D. Trenholm,")).toBeVisible();
    await chooseStyle(page, /Vancouver/);
    await expect(chip(page, "(1, p. 4)")).toBeVisible();
  });

  test("paper names in the library follow the style too", async ({ page }) => {
    await page.goto("/demo");
    const library = page.getByRole("complementary", { name: "Library" });
    await expect(library.getByText("Calloway et al., 2023")).toBeVisible();
    await chooseStyle(page, /Chicago/);
    await expect(library.getByText("Calloway, Mbeki, and Trenholm, 2023")).toBeVisible();
  });

  test("the choice is remembered after a reload and on other pages", async ({ page }) => {
    await page.goto("/demo");
    await chooseStyle(page, /Harvard/);
    await page.reload();
    await expect(chip(page, "Calloway, Mbeki and Trenholm, 2023, p. 4")).toBeVisible();
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Show source: Calloway, Mbeki and Trenholm, 2023, p. 4" }),
    ).toBeVisible();
  });

  test("the lens still works after the style changes", async ({ page }) => {
    await page.goto("/demo");
    await chooseStyle(page, /MLA 9/);
    await chip(page, "Calloway et al. 7").click();
    await expect(
      page.getByRole("region", { name: "Source passages" }).locator('[data-passage-id="s2"]'),
    ).toHaveAttribute("data-lens-state", "focused");
  });
});
