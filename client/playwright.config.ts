import { defineConfig } from "@playwright/test";

// These tests save real invoices, so they only run against a local app.
const baseURL = process.env.E2E_BASE_URL || "http://localhost:5174";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(baseURL)) {
  throw new Error(`Refusing to run e2e tests against ${baseURL}`);
}

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  use: {
    baseURL,
    viewport: { width: 1366, height: 768 },
    launchOptions: { executablePath: process.env.PW_EXE || undefined },
  },
});
