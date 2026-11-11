import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import jwt from "jsonwebtoken";

// No database or Redis is reachable here, so every query fails.
process.env.VERCEL = "1";
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "errors-test-secret";
process.env.DATABASE_URL = "postgresql://none:none@127.0.0.1:1/none";
process.env.REDIS_URL = "redis://127.0.0.1:1";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require("../src/app").default;

const admin = jwt.sign({ sub: 1, role: "ADMIN" }, "errors-test-secret", {
  expiresIn: "5m",
});

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

test("every response carries a request id", async () => {
  const res = await fetch(`${base}/`);
  assert.match(res.headers.get("x-request-id") ?? "", /^[0-9a-f-]{36}$/);
});

test("health reports the database state and nothing else", async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { ok: false, db: "error" });
});

test("a body that is not JSON gets a 400 without parser details", async () => {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not json",
  });
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: "The request could not be read." });
});

test("a failed purchase hides the database error behind a request id", async () => {
  const res = await fetch(`${base}/api/purchases`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${admin}` },
    body: JSON.stringify({ supplierId: 1, rows: [{ itemId: 1, qty: 1, rate: 1 }] }),
  });
  const body = await res.json();
  assert.equal(res.status, 500);
  assert.equal(body.error, "Something went wrong. Please try again.");
  assert.equal(body.requestId, res.headers.get("x-request-id"));
  assert.doesNotMatch(JSON.stringify(body), /prisma|postgres|127\.0\.0\.1/i);
});
