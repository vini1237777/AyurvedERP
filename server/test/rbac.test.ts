import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, test } from "node:test";
import jwt from "jsonwebtoken";

const SECRET = "rbac-test-secret";

// These tests never reach a real database or Redis. A request that passes the
// guards fails with a 500 at the unreachable database, so nothing can be changed.
process.env.VERCEL = "1";
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = SECRET;
process.env.DATABASE_URL = "postgresql://none:none@127.0.0.1:1/none";
process.env.REDIS_URL = "redis://127.0.0.1:1";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require("../src/app").default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolveJwtSecrets } = require("../src/utils/secrets");

type Role = "ADMIN" | "SELLER" | "ACCOUNTANT" | "RETAILER";
const ROLES: Role[] = ["ADMIN", "SELLER", "ACCOUNTANT", "RETAILER"];

const WRITE_ACCESS: Record<string, Role[]> = {
  customers: ["ADMIN", "SELLER"],
  invoices: ["ADMIN", "SELLER"],
  items: ["ADMIN"],
  batches: ["ADMIN"],
  agents: ["ADMIN"],
  hsn: ["ADMIN"],
  "category-prices": ["ADMIN"],
  company: ["ADMIN"],
  purchases: ["ADMIN"],
};
const RESOURCES = Object.keys(WRITE_ACCESS);
const WRITES = [
  { method: "POST", suffix: "" },
  { method: "PUT", suffix: "/999999999" },
  { method: "PATCH", suffix: "/999999999" },
  { method: "DELETE", suffix: "/999999999" },
];

const tokenFor = (role: Role, secret = SECRET, options = {}) =>
  jwt.sign({ sub: 1, email: "t@example.com", role }, secret, {
    expiresIn: "5m",
    ...options,
  });

let server: Server;
let base: string;

const call = (method: string, path: string, token?: string) =>
  fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(method === "GET" ? {} : { body: "{}" }),
  });

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.closeAllConnections();
  server.close();
  setTimeout(() => process.exit(0), 50).unref();
});

describe("writes", () => {
  for (const resource of RESOURCES) {
    for (const role of ROLES) {
      const allowed = WRITE_ACCESS[resource].includes(role);
      test(`${role} ${allowed ? "can" : "cannot"} write ${resource}`, async () => {
        for (const { method, suffix } of WRITES) {
          const res = await call(
            method,
            `/api/${resource}${suffix}`,
            tokenFor(role),
          );
          await res.text();
          if (allowed) {
            assert.notEqual(res.status, 401, method);
            assert.notEqual(res.status, 403, method);
          } else {
            assert.equal(res.status, 403, method);
          }
        }
      });
    }
  }
});

// Who may read each resource, matching the menu in AppLayout.tsx.
const ALL = ROLES;
const READ_ACCESS: Record<string, Role[]> = {
  customers: ["ADMIN", "SELLER", "ACCOUNTANT"],
  "customers/options": ALL,
  invoices: ALL,
  items: ["ADMIN", "SELLER", "ACCOUNTANT"],
  batches: ["ADMIN", "ACCOUNTANT"],
  agents: ["ADMIN", "SELLER"],
  hsn: ["ADMIN", "SELLER", "ACCOUNTANT"],
  "category-prices/item-report": ALL,
  company: ALL,
  purchases: ["ADMIN", "ACCOUNTANT"],
  "reports/dashboard-summary": ALL,
  "reports/sale-register": ALL,
  "reports/stock": ALL,
  "reports/ledger": ["ADMIN", "ACCOUNTANT"],
  "reports/trial-balance": ["ADMIN", "ACCOUNTANT"],
  "reports/profit-loss": ["ADMIN", "ACCOUNTANT"],
  "reports/journal": ["ADMIN", "ACCOUNTANT"],
};

describe("reads", () => {
  for (const [resource, readers] of Object.entries(READ_ACCESS)) {
    for (const role of ROLES) {
      const allowed = readers.includes(role);
      test(`${role} ${allowed ? "can" : "cannot"} read ${resource}`, async () => {
        const res = await call("GET", `/api/${resource}`, tokenFor(role));
        await res.text();
        assert.notEqual(res.status, 401);
        if (allowed) assert.notEqual(res.status, 403);
        else assert.equal(res.status, 403);
      });
    }
  }

  test("a single customer is as private as the list", async () => {
    const res = await call("GET", "/api/customers/1", tokenFor("RETAILER"));
    await res.text();
    assert.equal(res.status, 403);
  });
});

describe("tokens", () => {
  const protectedPaths = Object.keys(READ_ACCESS);

  test("no token is rejected everywhere", async () => {
    for (const path of protectedPaths) {
      const res = await call("GET", `/api/${path}`);
      await res.text();
      assert.equal(res.status, 401, path);
    }
  });

  test("a token signed with the old public fallback is rejected", async () => {
    const forged = tokenFor("ADMIN", "dev-secret-change-me");
    const res = await call("DELETE", "/api/customers/1", forged);
    await res.text();
    assert.equal(res.status, 401);
  });

  test("an expired token is rejected", async () => {
    const expired = tokenFor("ADMIN", SECRET, { expiresIn: -10 });
    const res = await call("GET", "/api/customers", expired);
    await res.text();
    assert.equal(res.status, 401);
  });

  test("a token without a role cannot write", async () => {
    const noRole = jwt.sign({ sub: 1 }, SECRET, { expiresIn: "5m" });
    const res = await call("POST", "/api/customers", noRole);
    await res.text();
    assert.equal(res.status, 401);
  });

  test("a garbage token is rejected", async () => {
    const res = await call("GET", "/api/customers", "not.a.token");
    await res.text();
    assert.equal(res.status, 401);
  });

  test("an unknown role cannot write", async () => {
    const res = await call(
      "POST",
      "/api/items",
      tokenFor("INTERN" as unknown as Role),
    );
    await res.text();
    assert.equal(res.status, 403);
  });
});

describe("secrets", () => {
  test("production refuses to start without a secret", () => {
    assert.throws(
      () => resolveJwtSecrets({ NODE_ENV: "production" }),
      /must be set in production/,
    );
  });

  test("the refresh secret never falls back to the public value", () => {
    const { refreshSecret } = resolveJwtSecrets({
      NODE_ENV: "production",
      JWT_ACCESS_SECRET: "real",
    });
    assert.equal(refreshSecret, "real_refresh");
  });

  test("local development still runs without a secret", () => {
    assert.doesNotThrow(() => resolveJwtSecrets({ NODE_ENV: "development" }));
  });
});
