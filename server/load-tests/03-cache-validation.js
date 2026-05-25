// k6: focused cache validation. Hammers the dashboard endpoint to verify
// Redis cache is serving requests (target p95 < 200ms when cache is hot).

import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE || "http://localhost:3000/api";

export const options = {
  vus: 50,
  duration: "30s",
  thresholds: {
    "http_req_duration{name:dashboard}": ["p(95)<200"],
    http_req_failed: ["rate<0.01"],
  },
};

export function setup() {
  const res = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({
      email: "admin@aushadhi.local",
      password: "admin123",
    }),
    { headers: { "Content-Type": "application/json" } },
  );
  return { accessToken: res.json("accessToken") };
}

export default function (data) {
  const r = http.get(`${BASE}/reports/dashboard-summary`, {
    headers: { Authorization: `Bearer ${data.accessToken}` },
    tags: { name: "dashboard" },
  });
  check(r, { "200": (resp) => resp.status === 200 });
  sleep(0.1);
}
