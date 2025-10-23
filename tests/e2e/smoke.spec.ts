// tests/e2e/smoke.spec.ts
import { test, expect } from "@playwright/test";

test("LP opens", async ({ page }) => {
  await page.goto("/lp/star-pass-001");
  const heading = page.getByRole("heading", { name: /star pass 001/i });
  await expect(heading).toBeVisible();
  await expect(page.getByTestId("lp-cta-card").first()).toBeVisible();
});

test("Oracle result opens", async ({ page }) => {
  await page.goto("/oracle/1");

  const copyBtn = page.getByRole("button", { name: /リンクをコピー|copy link/i });
  await expect(copyBtn).toBeVisible();

  const xLink = page.getByRole("link", { name: /xで共有|share on x|tweet/i }).first();
  await expect(xLink).toBeVisible();

  const href = await xLink.getAttribute("href");
  expect(href!).toMatch(/(twitter\.com|x\.com)\/intent/i);

  const urlParam = new URL(href!).searchParams.get("url");
  const decoded = decodeURIComponent(urlParam ?? "");
  expect(decoded).toMatch(/^https?:\/\/.+\/oracle\/1$/);
});
