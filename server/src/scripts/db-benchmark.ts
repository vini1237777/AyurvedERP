// Times real report and list queries with EXPLAIN ANALYZE and names the indexes
// each plan uses. Writes are rolled back. Refuses any database without "bench"
// in its name, so it can't run against a real one.
//
//   createdb aushadhi_bench
//   DATABASE_URL=postgresql://.../aushadhi_bench npx prisma migrate deploy
//   psql -d aushadhi_bench -f load-tests/db-bench/generate-data.sql
//   DATABASE_URL=postgresql://.../aushadhi_bench npm run benchmark:db

import { PrismaClient } from "@prisma/client";

const RUNS = 9;
const prisma = new PrismaClient();

const NOT_CANCELLED = `status <> 'CANCELLED'`;
const MONTH = `"invoiceDate" >= '2026-01-01' AND "invoiceDate" < '2026-02-01'`;

const reads: { name: string; sql: string }[] = [
  {
    name: "Invoice list, one customer, page 1",
    sql: `SELECT * FROM "Invoice" WHERE "customerId" = 77 AND ${NOT_CANCELLED}
          ORDER BY "invoiceDate" DESC LIMIT 50`,
  },
  {
    name: "Invoice count, one customer",
    sql: `SELECT count(*) FROM "Invoice" WHERE "customerId" = 77 AND ${NOT_CANCELLED}`,
  },
  {
    name: "Party ledger, one customer, one year",
    sql: `SELECT * FROM "Invoice" WHERE "customerId" = 77 AND ${NOT_CANCELLED}
          AND "invoiceDate" >= '2025-04-01' AND "invoiceDate" < '2026-04-01'
          ORDER BY "invoiceDate" ASC`,
  },
  {
    name: "Invoice list, newest first, page 1",
    sql: `SELECT * FROM "Invoice" WHERE ${NOT_CANCELLED}
          ORDER BY "invoiceDate" DESC LIMIT 50`,
  },
  {
    name: "Invoice list, oldest year, page 1",
    sql: `SELECT * FROM "Invoice" WHERE ${NOT_CANCELLED} AND "financialYear" = '2024-25'
          ORDER BY "invoiceDate" DESC LIMIT 50`,
  },
  {
    name: "Sale register, one month",
    sql: `SELECT * FROM "Invoice" WHERE ${NOT_CANCELLED} AND ${MONTH}
          ORDER BY "invoiceDate" DESC`,
  },
  {
    name: "GST summary, one year and month",
    sql: `SELECT sum("totalTaxable"), sum("totalTax") FROM "Invoice"
          WHERE ${NOT_CANCELLED} AND "financialYear" = '2025-26' AND ${MONTH}`,
  },
  {
    name: "GST summary, whole year",
    sql: `SELECT sum("totalTaxable"), sum("totalTax") FROM "Invoice"
          WHERE ${NOT_CANCELLED} AND "financialYear" = '2025-26'`,
  },
  {
    name: "Lines of one invoice",
    sql: `SELECT * FROM "InvoiceItem" WHERE "invoiceId" = 4242`,
  },
  {
    name: "HSN summary, one month",
    sql: `SELECT ii."hsnCode", sum(ii."taxableAmt") FROM "InvoiceItem" ii
          JOIN "Invoice" i ON i.id = ii."invoiceId"
          WHERE i.${NOT_CANCELLED} AND i.${MONTH}
          GROUP BY ii."hsnCode"`,
  },
  {
    // Worst case for this check: a batch with no sales scans the whole table.
    name: "Check an unsold batch before deleting it",
    sql: `SELECT 1 FROM "InvoiceItem" WHERE "batchId" = 999999 LIMIT 1`,
  },
  {
    name: "Batches of one item, newest first",
    sql: `SELECT * FROM "Batch" WHERE "itemId" = 250 ORDER BY "createdAt" DESC`,
  },
  {
    // Oldest year is the worst case when walking a date index from the newest row.
    name: "Purchase list, oldest year, page 1",
    sql: `SELECT * FROM "Purchase" WHERE "financialYear" = '2024-25'
          ORDER BY "purchaseDate" DESC LIMIT 50`,
  },
  {
    name: "Purchase list, newest first, page 1",
    sql: `SELECT * FROM "Purchase" ORDER BY "purchaseDate" DESC LIMIT 50`,
  },
  {
    name: "Lines of one purchase",
    sql: `SELECT * FROM "PurchaseItem" WHERE "purchaseId" = 4242`,
  },
];

const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

function indexesIn(plan: any, found = new Set<string>()): Set<string> {
  if (plan["Index Name"]) found.add(plan["Index Name"]);
  for (const child of plan.Plans ?? []) indexesIn(child, found);
  return found;
}

async function explain(sql: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`,
  );
  return rows[0]["QUERY PLAN"][0];
}

// Roll back so repeated runs measure the same table each time.
async function timeSaleInserts() {
  const times: number[] = [];
  for (let run = 0; run < RUNS; run++) {
    const started = performance.now();
    await prisma
      .$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`
          WITH new_invoices AS (
            INSERT INTO "Invoice" (
              "invoiceNo", "invoiceDate", "customerId", "customerState",
              "customerStateCode", "updatedAt"
            )
            SELECT 'W-' || g, '2026-06-01', 1 + (g % 2000), 'Maharashtra', '27', now()
            FROM generate_series(1, 1000) g
            RETURNING id
          )
          INSERT INTO "InvoiceItem" (
            "invoiceId", "itemId", "batchId", "itemName", "hsnCode", rate, qty,
            "basicAmt", "taxableAmt", "gstPercent", "taxAmt", "netValue"
          )
          SELECT id, 1, 1, 'Item', '30049011', 250, 1, 250, 250, 12, 30, 280
          FROM new_invoices, generate_series(1, 4)
        `);
        throw new Error("rollback");
      })
      .catch((err) => {
        if (err.message !== "rollback") throw err;
      });
    times.push(performance.now() - started);
  }
  return median(times);
}

async function main() {
  const [{ db }] = await prisma.$queryRaw<{ db: string }[]>`
    SELECT current_database() AS db`;
  if (!db.includes("bench")) throw new Error(`Refusing to run on database "${db}"`);

  const results = [];
  for (const { name, sql } of reads) {
    const times: number[] = [];
    let plan: any;
    for (let run = 0; run < RUNS; run++) {
      plan = await explain(sql);
      times.push(plan["Execution Time"]);
    }
    results.push({
      query: name,
      ms: Number(median(times).toFixed(2)),
      indexes: [...indexesIn(plan.Plan)].join(", ") || "none (sequential scan)",
    });
  }
  console.table(results);

  console.log(
    `1,000 invoices with 4 lines each, inserted and rolled back: ${(await timeSaleInserts()).toFixed(0)} ms`,
  );

  const [{ size }] = await prisma.$queryRaw<{ size: string }[]>`
    SELECT pg_size_pretty(sum(pg_indexes_size(oid))) AS size FROM pg_class
    WHERE relname IN ('Invoice', 'InvoiceItem', 'Batch', 'Purchase', 'PurchaseItem')`;
  console.log(`Index size on the benchmarked tables: ${size}`);
  if (process.env.BENCH_JSON) console.log(JSON.stringify(results));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
