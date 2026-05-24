import { performance } from "node:perf_hooks";

type Target = {
  key: string;
  name: string;
  path: string;
  invoiceCount: (body: any) => number;
};

function positiveInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function ms(value: number) {
  return `${value.toFixed(1)}ms`;
}

const baseUrl = (
  process.env.REPORT_BENCHMARK_URL || "http://localhost:5000/api"
).replace(/\/$/, "");
const financialYear = process.env.REPORT_BENCHMARK_FY;
const iterations = positiveInt("REPORT_BENCHMARK_ITERATIONS", 25);
const warmups = positiveInt("REPORT_BENCHMARK_WARMUPS", 5);
const fyQuery = financialYear
  ? `?financialYear=${encodeURIComponent(financialYear)}`
  : "";

const targetCatalog: Target[] = [
  {
    key: "gst-r3",
    name: "GSTR-3B summary",
    path: `/reports/gst-r3${fyQuery}`,
    invoiceCount: (body) => Number(body.summary?.totalInvoices || 0),
  },
  {
    key: "gst-r1",
    name: "GSTR-1 detail",
    path: `/reports/gst-r1${fyQuery}`,
    invoiceCount: (body) => Number(body.summary?.totalInvoices || 0),
  },
  {
    key: "sale-register",
    name: "Sale register",
    path: "/reports/sale-register",
    invoiceCount: (body) => (Array.isArray(body) ? body.length : 0),
  },
];

const requestedTargets = process.env.REPORT_BENCHMARK_TARGETS?.split(",")
  .map((target) => target.trim())
  .filter(Boolean);
const targets = requestedTargets?.length
  ? targetCatalog.filter((target) => requestedTargets.includes(target.key))
  : targetCatalog;

if (!targets.length) {
  throw new Error(
    `REPORT_BENCHMARK_TARGETS must include one of: ${targetCatalog.map((target) => target.key).join(", ")}`,
  );
}

async function fetchTarget(target: Target) {
  const start = performance.now();
  const url = `${baseUrl}${target.path}`;
  const response = await fetch(url);
  const text = await response.text();
  const elapsed = performance.now() - start;

  if (!response.ok) {
    throw new Error(`${target.name} failed with HTTP ${response.status}`);
  }

  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(
      `${target.name} expected JSON from ${url}; received ${response.headers.get("content-type") || "unknown content type"}`,
    );
  }

  return {
    elapsed,
    invoiceCount: target.invoiceCount(body),
  };
}

async function runTarget(target: Target) {
  for (let i = 0; i < warmups; i++) {
    await fetchTarget(target);
  }

  const samples: number[] = [];
  let invoiceCount = 0;
  for (let i = 0; i < iterations; i++) {
    const sample = await fetchTarget(target);
    samples.push(sample.elapsed);
    invoiceCount = sample.invoiceCount;
  }

  return {
    name: target.name,
    invoiceCount,
    p50: percentile(samples, 50),
    p95: percentile(samples, 95),
    min: Math.min(...samples),
    max: Math.max(...samples),
  };
}

async function main() {
  console.log(
    `Benchmarking ${targets.length} report endpoints over ${iterations} measured runs after ${warmups} warmups.`,
  );
  console.log(`API: ${baseUrl}`);
  console.log(`Financial year: ${financialYear || "all seeded records"}`);
  console.log("");

  for (const target of targets) {
    const result = await runTarget(target);
    console.log(
      `${result.name}: invoices=${result.invoiceCount} p50=${ms(result.p50)} p95=${ms(result.p95)} min=${ms(result.min)} max=${ms(result.max)}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
