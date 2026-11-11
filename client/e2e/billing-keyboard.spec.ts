import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /^Admin/ }).click();
  await page.waitForURL("**/dashboard");
}

async function fillOneSale(page: Page, qty: string) {
  await page.goto("/sales/new");
  await expect(page.locator("#sale-customer")).toBeFocused();
  await page.keyboard.type("mahadev");
  await expect(page.getByRole("listbox").getByRole("option").first()).toBeVisible();
  await page.keyboard.press("Enter");
  await page.keyboard.type("akik");
  await expect(page.getByRole("listbox").getByRole("option").first()).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Qty, row 1")).toBeFocused();
  await page.keyboard.type(qty);
}

// The app keeps its access token in memory, so sign in separately here.
const invoiceCount = async (page: Page) => {
  const login = await page.request.post("/api/auth/login", {
    data: { email: "admin@aushadhi.local", password: "admin123" },
  });
  const { accessToken } = await login.json();
  const res = await page.request.get("/api/invoices?limit=1", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return (await res.json()).total as number;
};

test.beforeEach(async ({ page }) => signIn(page));

test("bills an invoice with no mouse", async ({ page }) => {
  const before = await invoiceCount(page);
  await fillOneSale(page, "1");

  // Enter walks Qty, Free, Dis and S Dis, then opens the next row.
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Free, row 1")).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Item, row 2")).toBeFocused();

  await page.keyboard.press("Control+s");
  await expect(page).toHaveURL(/\/sales$/);
  await expect(page.getByText(/Invoice .+ saved/)).toBeVisible();
  expect(await invoiceCount(page)).toBe(before + 1);
});

test("repeat save creates one invoice", async ({ page }) => {
  const before = await invoiceCount(page);
  await fillOneSale(page, "1");
  await page.route("**/api/invoices", async (route) => {
    if (route.request().method() === "POST") {
      await new Promise((done) => setTimeout(done, 500));
    }
    await route.continue();
  });
  await page.keyboard.press("Control+s");
  await page.keyboard.press("Control+s");
  await page.keyboard.press("Control+s");
  await expect(page).toHaveURL(/\/sales$/);
  expect(await invoiceCount(page)).toBe(before + 1);
});

test("explains too much quantity and saves nothing", async ({ page }) => {
  const before = await invoiceCount(page);
  await fillOneSale(page, "999999");
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("alert")).toContainText("left in this batch");
  await expect(page.getByLabel("Qty, row 1")).toBeFocused();
  expect(await invoiceCount(page)).toBe(before);
});

test("keeps the form when the save fails", async ({ page }) => {
  await fillOneSale(page, "3");
  await page.route("**/api/invoices", (route) =>
    route.request().method() === "POST" ? route.abort() : route.continue(),
  );
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("alert")).toContainText("not saved");
  await expect(page.getByLabel("Qty, row 1")).toHaveValue("3");
});

test("Escape closes the list and Tab leaves a filled field alone", async ({
  page,
}) => {
  await fillOneSale(page, "1");
  const customer = page.locator("#sale-customer");
  const name = await customer.inputValue();
  await customer.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(customer).toHaveValue(name);
});
