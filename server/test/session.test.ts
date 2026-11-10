import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

// No database or Redis is reachable; these tests stop before either is needed.
process.env.VERCEL = "1";
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "session-test-secret";
process.env.DATABASE_URL = "postgresql://none:none@127.0.0.1:1/none";
process.env.REDIS_URL = "redis://127.0.0.1:1";
delete process.env.CORS_ORIGINS;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require("../src/app").default;

let server: Server;
let base: string;

before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.closeAllConnections();
  server.close();
  setTimeout(() => process.exit(0), 50).unref();
});

test("refresh without the cookie is refused", async () => {
  const res = await fetch(`${base}/api/auth/refresh`, { method: "POST" });
  assert.equal(res.status, 401);
});

test("a refresh token in the body is ignored", async () => {
  const res = await fetch(`${base}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: "anything" }),
  });
  assert.equal(res.status, 401);
});

test("logout clears the cookie with the same safe attributes", async () => {
  const res = await fetch(`${base}/api/auth/logout`, { method: "POST" });
  assert.equal(res.status, 204);
  const cookie = res.headers.get("set-cookie") ?? "";
  assert.match(cookie, /^aushadhi_rt=;/);
  assert.match(cookie, /Path=\/api\/auth/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
});

const preflight = (origin: string) =>
  fetch(`${base}/api/customers`, {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization",
    },
  });

test("a listed origin may call the API", async () => {
  const res = await preflight("http://localhost:5173");
  assert.equal(res.headers.get("access-control-allow-origin"), "http://localhost:5173");
});

test("any other origin gets no CORS permission", async () => {
  const res = await preflight("https://evil.example.com");
  assert.equal(res.headers.get("access-control-allow-origin"), null);
});

test("the seed token header is no longer allowed", async () => {
  const res = await preflight("http://localhost:5173");
  assert.doesNotMatch(res.headers.get("access-control-allow-headers") ?? "", /seed/i);
});
