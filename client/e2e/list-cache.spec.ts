import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, account: RegExp) {
  await page.goto("/login");
  await page.getByRole("button", { name: account }).click();
  await page.waitForURL(/dashboard/);
}

// Moves inside the app without a reload, which would empty the cache.
async function openFromApp(page: Page, path: string) {
  await page.evaluate((to) => {
    window.history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}

function countApiCalls(page: Page, match: RegExp) {
  const calls: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "GET" && match.test(req.url())) calls.push(req.url());
  });
  return calls;
}

test("coming back to a list shows rows without another request", async ({
  page,
}) => {
  await signIn(page, /^Admin/);
  const calls = countApiCalls(page, /\/api\/customers$/);

  await openFromApp(page, "/masters/customers");
  await expect(page.locator("table tbody tr").first()).toBeVisible();
  expect(calls).toHaveLength(1);

  await openFromApp(page, "/dashboard");
  await expect(page.locator("table tbody tr")).toHaveCount(0);
  await openFromApp(page, "/masters/customers");
  await expect(page.locator("table tbody tr").first()).toBeVisible();
  expect(calls).toHaveLength(1);
});

test("the batch list only loads items when the form opens", async ({ page }) => {
  await signIn(page, /^Admin/);
  const calls = countApiCalls(page, /\/api\/items$/);

  await openFromApp(page, "/masters/batches");
  await expect(page.locator("table tbody tr").first()).toBeVisible();
  expect(calls).toHaveLength(0);

  await page.getByRole("button", { name: /new batch|add batch/i }).first().click();
  await expect.poll(() => calls.length).toBe(1);
});

test("a failed list keeps the screen usable and says so", async ({ page }) => {
  await signIn(page, /^Admin/);
  await page.route(/\/api\/customers$/, (route) =>
    route.fulfill({ status: 500, json: { error: "down" } }),
  );
  await openFromApp(page, "/masters/customers");
  await expect(page.getByText("Failed to load customers")).toBeVisible({
    timeout: 15_000,
  });
});

test("the next person to sign in loads their own list", async ({ page }) => {
  await signIn(page, /^Admin/);
  await openFromApp(page, "/masters/customers");
  await expect(page.locator("table tbody tr").first()).toBeVisible();

  await page.locator('[aria-haspopup="menu"]').first().click();
  await page.getByRole("menuitem", { name: /log ?out|sign ?out/i }).click();
  await page.waitForURL(/login/);

  await page.getByRole("button", { name: /^Seller/ }).click();
  await page.waitForURL(/dashboard/);
  const calls = countApiCalls(page, /\/api\/customers$/);
  await openFromApp(page, "/masters/customers");
  await expect(page.locator("table tbody tr").first()).toBeVisible();
  expect(calls).toHaveLength(1);
});

test("a cancelled invoice leaves the cached list at once", async ({ page }) => {
  await signIn(page, /^Admin/);
  await openFromApp(page, "/sales");
  const heading = page.getByText(/\d+ invoices in FY/);
  await expect(heading).toBeVisible();
  const before = Number((await heading.innerText()).match(/\d+/)?.[0]);
  expect(before).toBeGreaterThan(0);

  await page
    .locator("table tbody tr")
    .first()
    .getByRole("button", { name: "Cancel" })
    .click();
  await page.getByRole("button", { name: "Cancel invoice" }).click();
  await expect(page.getByText(`${before - 1} invoices in FY`)).toBeVisible();
});
