// k6: realistic user journey. Each VU logs in once, then loops refresh →
// dashboard → invoices → customers with 2–5s think time between actions.

import http from "k6/http";
import { check, sleep, group } from "k6";

const BASE = __ENV.BASE || "http://localhost:3000/api";

export const options = {
  // Keep each VU's refresh cookie across iterations, like a browser would.
  noCookiesReset: true,
  stages: [
    { duration: "1m", target: 500 },
    { duration: "3m", target: 500 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<1500"],
    http_req_failed: ["rate<0.02"],
  },
};

// Refresh tokens rotate, so each VU keeps its own session: it signs in on its
// first iteration, and k6's per VU cookie jar carries the refresh cookie. With
// many VUs signing in from one address, start the API with
// LOGIN_LIMIT_PER_IP=1000000.
let session = null;

function login() {
  const res = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({
      email: "admin@aushadhi.local",
      password: "admin123",
    }),
    { headers: { "Content-Type": "application/json" }, tags: { name: "login" } },
  );
  if (res.status !== 200) {
    throw new Error(`Login failed: ${res.status} ${res.body}`);
  }
  return { accessToken: res.json("accessToken") };
}

export default function () {
  if (!session) session = login();

  if (Math.random() < 0.25) {
    group("refresh", () => {
      const r = http.post(`${BASE}/auth/refresh`, null, {
        tags: { name: "refresh" },
      });
      check(r, { "refresh 200": (resp) => resp.status === 200 });
      if (r.status === 200) {
        session.accessToken = r.json("accessToken");
      }
    });
  }

  const accessToken = session.accessToken;
  const authHeaders = {
    headers: { Authorization: `Bearer ${accessToken}` },
  };

  group("dashboard", () => {
    const r = http.get(`${BASE}/reports/dashboard-summary`, {
      ...authHeaders,
      tags: { name: "dashboard" },
    });
    check(r, { "dashboard 200": (resp) => resp.status === 200 });
  });

  group("invoices", () => {
    const r = http.get(`${BASE}/invoices?page=1&limit=50`, {
      ...authHeaders,
      tags: { name: "invoices" },
    });
    check(r, { "invoices 200": (resp) => resp.status === 200 });
  });

  group("customers", () => {
    const r = http.get(`${BASE}/customers`, {
      ...authHeaders,
      tags: { name: "customers" },
    });
    check(r, { "customers 200": (resp) => resp.status === 200 });
  });

  sleep(Math.random() * 3 + 2);
}
