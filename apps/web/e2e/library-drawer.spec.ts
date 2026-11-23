import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("the mobile library drawer shows one Library heading, and it labels the drawer", async ({
  page,
}) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Library", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Library" });
  await expect(dialog).toBeVisible();

  // Exactly one visible "Library" heading inside the drawer.
  await expect(dialog.getByRole("heading", { name: "Library" })).toHaveCount(1);

  // The drawer's aria-labelledby points at that heading.
  const labelledBy = await dialog.getAttribute("aria-labelledby");
  expect(labelledBy).toBeTruthy();
  await expect(page.locator(`[id="${labelledBy}"]`)).toHaveText("Library");

  // No id appears twice (the desktop pane is hidden but still in the page).
  const duplicates = await page.evaluate(() => {
    const seen = new Map<string, number>();
    for (const el of document.querySelectorAll("[id]")) {
      seen.set(el.id, (seen.get(el.id) ?? 0) + 1);
    }
    return [...seen].filter(([, n]) => n > 1).map(([id]) => id);
  });
  expect(duplicates).toEqual([]);
});
