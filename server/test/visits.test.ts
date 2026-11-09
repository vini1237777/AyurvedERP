import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

process.env.VERCEL = "1";
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "visits-test-secret";
process.env.DATABASE_URL = "postgresql://none:none@127.0.0.1:1/none";
process.env.REDIS_URL = "redis://127.0.0.1:1";

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
});

test("needs no login, and answers 503 when the database is down", async () => {
  const res = await fetch(`${base}/api/visits`, { method: "POST" });
  assert.equal(res.status, 503);
});
