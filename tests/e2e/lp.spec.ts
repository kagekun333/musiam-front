// tests/e2e/lp.spec.ts
import { test, expect } from "@playwright/test";

test("lp: view + card checkout", async ({ page }) => {
  await page.goto("/lp/star-pass-001");
  const cta = page.getByTestId("lp-cta-card").last();
  await expect(cta).toBeVisible();

  // ここを context ではなく page の 'popup' に
  const [newTab] = await Promise.all([
    page.waitForEvent("popup"),
    cta.click(),
  ]);
  await newTab.waitForLoadState("domcontentloaded");
  await expect(newTab.url()).toMatch(/^https?:\/\//);
});
