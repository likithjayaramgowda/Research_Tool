import { expect, test, type Page } from "@playwright/test";

const STAGE = '[data-demo-loop][data-variant="full"] [data-demo="stage"]';

/** Opacity of every animated piece of the loop, as one string: a fingerprint of its progress. */
const fingerprint = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-demo-loop][data-variant="full"] [data-demo]'))
      .map((el) => `${getComputedStyle(el).opacity}/${getComputedStyle(el).transform}`)
      .join("|"),
  );

test.describe("demo loop: first paint and reduced motion", () => {
  test("first paint is the end state: everything visible, nothing hidden by inline style", async ({
    page,
  }) => {
    await page.goto("/");
    // Straight after load, before the loop starts (it waits about a second).
    const state = await page.evaluate(() => {
      const root = document.querySelector('[data-demo-loop][data-variant="full"]')!;
      const hidden = Array.from(root.querySelectorAll<HTMLElement>("[data-demo]")).filter(
        (el) => getComputedStyle(el).opacity !== "1" && !el.matches('[data-demo="passage-2"]'),
      );
      return hidden.map((el) => el.getAttribute("data-demo"));
    });
    expect(state).toEqual([]);
  });

  test("reduced motion: the end state stays, and nothing is ever animated", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    const before = await fingerprint(page);
    await page.waitForTimeout(4000); // well past the point where the loop would have started
    expect(await fingerprint(page)).toBe(before);
    const inline = await page.evaluate(
      () => document.querySelectorAll('[data-demo-loop] [data-demo][style*="opacity"]').length,
    );
    expect(inline).toBe(0);
    // The end state: the highlight and the chosen chip are showing.
    await expect(page.locator('[data-demo="highlight"]').first()).toHaveCSS("opacity", "1");
    await expect(page.locator('[data-demo="chip-1-on"]').first()).toHaveCSS("opacity", "1");
    await context.close();
  });

  test("it is decorative: hidden from assistive technology and not focusable", async ({ page }) => {
    await page.goto("/");
    const root = page.locator('[data-demo-loop][data-variant="full"]');
    await expect(root).toHaveAttribute("aria-hidden", "true");
    await expect(root).toHaveAttribute("inert", "");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(() => !!document.activeElement?.closest("[data-demo-loop]"));
    expect(inside).toBe(false);
  });
});

test.describe("demo loop: playback", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("loops in 12 to 15 seconds, and animates only transform and opacity", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/");
    const t0 = Date.now();
    const dips: number[] = [];
    const properties = new Set<string>();
    let low = false;
    while (Date.now() - t0 < 19_000) {
      const { opacity, props } = await page.evaluate((stage) => {
        const props = new Set<string>();
        for (const el of document.querySelectorAll<HTMLElement>("[data-demo-loop] [data-demo]")) {
          for (const name of Array.from(el.style)) props.add(name);
        }
        return {
          opacity: Number(getComputedStyle(document.querySelector(stage)!).opacity),
          props: Array.from(props),
        };
      }, STAGE);
      props.forEach((p) => properties.add(p));
      if (opacity < 0.05 && !low) dips.push((Date.now() - t0) / 1000);
      low = opacity < 0.05;
      await page.waitForTimeout(80);
    }
    // First dip: the end state fading away before the loop starts. Second: the loop's own fade.
    expect(dips.length).toBeGreaterThanOrEqual(2);
    const loopSeconds = dips[1] - dips[0];
    expect(loopSeconds).toBeGreaterThan(12);
    expect(loopSeconds).toBeLessThan(15.5);
    // Never a layout property: only opacity and transform (and what transform is made of).
    const allowed = new Set(["opacity", "transform", "translate", "scale", "will-change"]);
    expect(Array.from(properties).filter((p) => !allowed.has(p))).toEqual([]);
  });

  test("it pauses off-screen and while the tab is hidden, and resumes", async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto("/");
    await page.waitForTimeout(4200); // mid-way through the question typing

    // Off-screen.
    await page.evaluate(() => window.scrollTo(0, 3000));
    await page.waitForTimeout(400);
    const away1 = await fingerprint(page);
    await page.waitForTimeout(1500);
    expect(await fingerprint(page)).toBe(away1);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    expect(await fingerprint(page)).not.toBe(away1);

    // Hidden tab.
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(400);
    const hidden1 = await fingerprint(page);
    await page.waitForTimeout(1500);
    expect(await fingerprint(page)).toBe(hidden1);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(600);
    expect(await fingerprint(page)).not.toBe(hidden1);
  });

  test("sign-in: the quiet loop plays once, then stays on its end state", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/sign-in");
    const quiet = '[data-demo-loop][data-variant="quiet"] [data-demo="stage"]';
    // It does not loop: after the one run (about 25 s) it is still showing the end state.
    await page.waitForTimeout(36_000);
    await expect(page.locator(quiet)).toHaveCSS("opacity", "1");
    await expect(page.locator('[data-variant="quiet"] [data-demo="highlight"]')).toHaveCSS(
      "opacity",
      "1",
    );
    await page.waitForTimeout(16_000); // a full extra loop's worth: it must not have restarted
    await expect(page.locator(quiet)).toHaveCSS("opacity", "1");
  });
});

/**
 * Worst WCAG contrast between `color` and any rendered pixel inside the element's box, read from
 * a real screenshot. Run with the page's text transparent, so the pixels are what is behind it.
 */
async function worstContrast(page: Page, selector: string, color: string): Promise<number> {
  const box = await page.evaluate((sel) => {
    const r = document.querySelector(sel)!.getBoundingClientRect();
    // Inset a little: rounded corners show the page behind the element, and no text sits there.
    const inset = 4;
    return {
      x: r.x + window.scrollX + inset,
      y: r.y + window.scrollY + inset,
      width: r.width - inset * 2,
      height: r.height - inset * 2,
    };
  }, selector);
  const shot = await page.screenshot({ clip: box, fullPage: true });
  return page.evaluate(
    async ({ bytes, color }) => {
      const bitmap = await createImageBitmap(
        new Blob([new Uint8Array(bytes)], { type: "image/png" }),
      );
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
      const lin = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      const lum = (r: number, g: number, b: number) =>
        0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      const [tr, tg, tb] = (color.match(/\d+(\.\d+)?/g) ?? []).map(Number);
      const text = lum(tr, tg, tb);
      let worst = Infinity;
      for (let i = 0; i < data.length; i += 4) {
        const bg = lum(data[i], data[i + 1], data[i + 2]);
        const [hi, lo] = text > bg ? [text, bg] : [bg, text];
        worst = Math.min(worst, (hi + 0.05) / (lo + 0.05));
      }
      return worst;
    },
    { bytes: Array.from(shot), color },
  );
}

const PROBES = [
  {
    path: "/",
    name: "home",
    selectors: ["#hero-heading", "#hero-heading ~ p", "a[href='/demo']", "a[href='/sign-in']"],
  },
  { path: "/sign-in", name: "sign-in", selectors: ["main h1", "main p", "main p + p"] },
];

for (const probe of PROBES) {
  for (const theme of ["light", "dark"] as const) {
    for (const width of [1280, 1024, 390]) {
      test(`contrast stays AA on every frame: ${probe.name} ${theme} ${width}px`, async ({
        browser,
      }) => {
        test.setTimeout(60_000);
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          colorScheme: theme,
        });
        const page = await context.newPage();
        await page.goto(probe.path);
        await page.evaluate(() => document.fonts.ready);

        // Read each text colour first, then make the text see-through so a screenshot shows
        // only what is behind it (the demo, at whatever frame it is on).
        const colours = await page.evaluate(
          (selectors) =>
            selectors.map((sel) => getComputedStyle(document.querySelector(sel)!).color),
          probe.selectors,
        );
        await page.addStyleTag({
          content:
            "main *{color:transparent!important;text-decoration-color:transparent!important}",
        });

        const start = Date.now();
        let frames = 0;
        let worst = Infinity;
        let where = "";
        while (Date.now() - start < 17_000) {
          // 17 s is more than one whole loop (about 14 s plus the start-up fade).
          for (const [i, selector] of probe.selectors.entries()) {
            const c = await worstContrast(page, selector, colours[i]);
            if (c < worst) {
              worst = c;
              where = `${selector} at ${((Date.now() - start) / 1000).toFixed(1)}s`;
            }
          }
          frames += 1;
        }
        expect(frames).toBeGreaterThan(10);
        expect(worst, `worst contrast was ${worst.toFixed(2)} at ${where}`).toBeGreaterThanOrEqual(
          4.5,
        );
        await context.close();
      });
    }
  }
}
