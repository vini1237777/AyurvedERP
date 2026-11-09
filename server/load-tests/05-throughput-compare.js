// k6: read throughput with no think time, so the server is the limit.
// run-compare.sh runs this same load against each server setup.

import http from "k6/http";
import { check } from "k6";

const BASE = __ENV.BASE || "http://localhost:5057/api";

export const options = {
  vus: Number(__ENV.VUS || 100),
  duration: __ENV.DURATION || "30s",
  summaryTrendStats: ["avg", "med", "p(95)", "p(99)", "max"],
};

export function setup() {
  const res = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ email: "admin@aushadhi.local", password: "admin123" }),
    { headers: { "Content-Type": "application/json" } },
  );
  if (res.status !== 200) throw new Error(`Login failed: ${res.status}`);
  return { token: res.json("accessToken") };
}

const PATHS = ["reports/dashboard-summary", "customers", "items"];

export default function (data) {
  const path = PATHS[Math.floor(Math.random() * PATHS.length)];
  const res = http.get(`${BASE}/${path}`, {
    headers: { Authorization: `Bearer ${data.token}` },
    tags: { name: path },
  });
  check(res, { "status is 200": (r) => r.status === 200 });
}
