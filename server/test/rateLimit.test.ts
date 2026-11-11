import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import express from "express";

// Redis is unreachable, so these tests exercise the in-memory fallback.
process.env.REDIS_URL = "redis://127.0.0.1:1";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { loginRateLimit, loginLimits } = require("../src/middleware/rateLimit");

// A stand-in login: the password "right" succeeds, anything else is a 401.
const app = express();
app.set("trust proxy", 1);
app.use(express.json());
app.post("/login", loginRateLimit, (req, res) =>
  req.body.password === "right"
    ? res.json({ ok: true })
    : res.status(401).json({ error: "Invalid credentials" }),
);

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

const login = (ip: string, email: string, password: string) =>
  fetch(`${base}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
    body: JSON.stringify({ email, password }),
  });

test("failed attempts for one account are capped, with Retry-After", async () => {
  for (let i = 0; i < loginLimits.failuresPerAccount; i++)
    assert.equal((await login("10.0.0.1", "a@x.in", "wrong")).status, 401);

  const blocked = await login("10.0.0.1", "a@x.in", "right");
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("retry-after")) > 0);
  assert.match((await blocked.json()).error, /Try again in \d+ minutes?/);
});

test("the cap is per account, and ignores email case", async () => {
  assert.equal((await login("10.0.0.1", "b@x.in", "right")).status, 200);
  assert.equal((await login("10.0.0.1", " A@X.IN ", "right")).status, 429);
});

test("successful sign ins don't count as failures", async () => {
  for (let i = 0; i < loginLimits.failuresPerAccount + 5; i++)
    assert.equal((await login("10.0.0.2", "demo@x.in", "right")).status, 200);
});

test("every address has an overall cap", async () => {
  let last = 0;
  for (let i = 0; i <= loginLimits.perIp; i++)
    last = (await login("10.0.0.3", `user${i}@x.in`, "right")).status;
  assert.equal(last, 429);
  assert.equal((await login("10.0.0.4", "user0@x.in", "right")).status, 200);
});
