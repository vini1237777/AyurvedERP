// k6: burst-login scenario. Simulates a 9am login storm.

import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE || "http://localhost:3000/api";

export const options = {
  stages: [
    { duration: "30s", target: 200 },
    { duration: "60s", target: 200 },
    { duration: "20s", target: 0 },
  ],
  thresholds: {
    "http_req_duration{name:login}": ["p(95)<2000"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  const res = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({
      email: "admin@aushadhi.local",
      password: "admin123",
    }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { name: "login" },
    },
  );
  check(res, {
    "login 200": (r) => r.status === 200,
    "has accessToken": (r) => typeof r.json("accessToken") === "string",
  });
  sleep(1);
}
