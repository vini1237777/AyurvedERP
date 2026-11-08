import { expect, test } from "@playwright/test";

test("signed-out visitors land on sign-in with no home link", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Home" })).toHaveCount(0);
});

test("the old landing address goes to sign-in", async ({ page }) => {
  await page.goto("/welcome");
  await expect(page).toHaveURL(/\/login$/);
});

test("a wrong password stays on the page and explains", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("don't match");
  await expect(page).toHaveURL(/\/login$/);
});

test("a demo account signs in with one click, then skips sign-in", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Accountant/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/dashboard$/);
});
