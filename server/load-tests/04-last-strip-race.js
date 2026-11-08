// Many cashiers bill the same batch at the same moment.
//
// Usage:
//   psql -c 'UPDATE "Batch" SET "currentQty" = 1 WHERE id = <batch>'
//   k6 run -e BATCH_ID=<batch> -e ITEM_ID=<item> -e CUSTOMER_ID=<customer> \
//     load-tests/04-last-strip-race.js
//
// k6 only counts the responses. Check the result in SQL afterwards: the stock
// must not be negative and the number of new invoices must match the 201s.

import http from "k6/http";
import { Counter } from "k6/metrics";

const BASE = __ENV.BASE || "http://localhost:3000/api";
const CASHIERS = Number(__ENV.CASHIERS || 20);
const QTY = Number(__ENV.QTY || 1);

const sold = new Counter("sale_201_sold");
const refused = new Counter("sale_409_refused");
const failed = new Counter("sale_other_failed");

export const options = {
  scenarios: {
    race: {
      executor: "per-vu-iterations",
      vus: CASHIERS,
      iterations: 1,
      maxDuration: "60s",
    },
  },
};

export function setup() {
  const res = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({
      email: __ENV.EMAIL || "admin@aushadhi.local",
      password: __ENV.PASSWORD || "admin123",
    }),
    { headers: { "Content-Type": "application/json" } },
  );
  if (res.status !== 200) throw new Error(`Login failed: ${res.status}`);
  return { token: res.json("accessToken") };
}

export default function ({ token }) {
  const res = http.post(
    `${BASE}/invoices`,
    JSON.stringify({
      customerId: Number(__ENV.CUSTOMER_ID),
      invoiceDate: new Date().toISOString(),
      rows: [
        {
          itemId: Number(__ENV.ITEM_ID),
          batchId: Number(__ENV.BATCH_ID),
          itemName: "Race test item",
          rate: 100,
          qty: QTY,
          gst: 12,
        },
      ],
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (res.status === 201) sold.add(1);
  else if (res.status === 409) refused.add(1);
  else {
    failed.add(1);
    console.log(`${res.status}: ${String(res.body).slice(0, 160)}`);
  }
}
