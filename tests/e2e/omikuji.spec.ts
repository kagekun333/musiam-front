// tests/e2e/omikuji.spec.ts
import { test, expect } from "@playwright/test";

test("omikuji -> result -> share", async ({ page }) => {
  await page.goto("/oracle/omikuji");

  const draw = page.getByTestId("omikuji-draw");
  await expect(draw).toBeVisible();

  await Promise.all([
    page.waitForURL(/\/oracle\/\d+$/),   // ← 遷移完了を確実に待つ
    draw.click(),
  ]);

  const copyBtn = page.getByRole("button", { name: /リンクをコピー|copy link/i });
  await expect(copyBtn).toBeVisible();

  const xLink = page.getByRole("link", { name: /xで共有|share on x|tweet/i }).first();
  await expect(xLink).toBeVisible();

  const href = await xLink.getAttribute("href");
  expect(href!).toMatch(/(twitter\.com|x\.com)\/intent/i);

  const urlParam = new URL(href!).searchParams.get("url");
  const decoded = decodeURIComponent(urlParam ?? "");
  expect(decoded).toMatch(/^https?:\/\/.+\/oracle\/\d+$/);
});
