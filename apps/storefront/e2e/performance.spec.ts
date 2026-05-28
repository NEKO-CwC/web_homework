import { expect, test } from "@playwright/test";

const HOME_PRODUCT_LIST_BUDGET_MS = 1000;

test("homepage product list renders within the local 1s budget", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "精选商品" })).toBeVisible();
  await expect(page.getByRole("link", { name: "空气感智能台灯" })).toBeVisible();

  const startedAt = performance.now();
  await page.goto("/?perf=warm", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "精选商品" })).toBeVisible();
  await expect(page.getByRole("link", { name: "空气感智能台灯" })).toBeVisible();
  const elapsedMs = performance.now() - startedAt;

  expect(elapsedMs).toBeLessThanOrEqual(HOME_PRODUCT_LIST_BUDGET_MS);
});
