import { expect, test } from "@playwright/test";
import path from "node:path";

const SHOTS = path.resolve(__dirname, "../../../docs/screenshots");
const shot = (name: string) => path.join(SHOTS, `${name}.png`);

// Screenshots of the interactive states, saved next to the page screenshots for the docs.
test.use({ reducedMotion: "reduce", colorScheme: "light" });

test("demo with the lens on a citation (wide)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/demo");
  await page
    .locator("#conversation")
    .getByRole("button", { name: "Show source: Hartigan et al., 2022, p. 3" })
    .click();
  await expect(
    page.getByRole("region", { name: "Source passages" }).locator('[data-passage-id="s3"]'),
  ).toHaveAttribute("data-lens-state", "focused");
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot("demo-lens-light-1280") });
});

test("citation style menu open (wide)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/demo");
  await page.getByRole("button", { name: /^Citations:/ }).click();
  await expect(page.getByRole("menuitemradio", { name: /Vancouver/ })).toBeVisible();
  await page.screenshot({ path: shot("demo-citation-menu-light-1280") });
});

test("a numbered style, IEEE (wide)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/demo");
  await page.getByRole("button", { name: /^Citations:/ }).click();
  await page.getByRole("menuitemradio", { name: /IEEE/ }).click();
  await expect(page.getByText("[1] A. M. Calloway")).toBeVisible();
  await page.getByText("[1] A. M. Calloway").scrollIntoViewIfNeeded();
  await page.screenshot({ path: shot("demo-ieee-light-1280") });
});

test("phone: library drawer and source bottom sheet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo");
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Library" })).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot("demo-library-drawer-light-390") });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Library" })).toBeHidden();
  await page
    .locator("#conversation")
    .getByRole("button", { name: "Show source: Calloway et al., 2023, p. 7" })
    .click();
  await expect(page.getByRole("dialog", { name: "Source" })).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot("demo-source-sheet-light-390") });
});
