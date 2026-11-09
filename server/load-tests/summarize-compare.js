// Prints a table from the raw k6 summaries written by run-compare.sh.
const fs = require("node:fs");
const path = require("node:path");

const dir = process.argv[2];
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const setups = {};
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const name = file.replace(/-run\d+\.json$/, "");
  const m = JSON.parse(fs.readFileSync(path.join(dir, file))).metrics;
  (setups[name] ||= []).push({
    rps: m.http_reqs.rate,
    p95: m.http_req_duration["p(95)"],
    failed: m.http_req_failed.value,
  });
}
console.log("| Setup | Runs | Median req/s | Range req/s | Median p95 | Failed |");
console.log("|---|---|---|---|---|---|");
for (const [name, r] of Object.entries(setups)) {
  const rates = r.map((x) => x.rps);
  console.log(
    `| ${name} | ${r.length} | ${median(rates).toFixed(0)} | ${Math.min(...rates).toFixed(0)} to ${Math.max(...rates).toFixed(0)} | ${median(r.map((x) => x.p95)).toFixed(0)} ms | ${(Math.max(...r.map((x) => x.failed)) * 100).toFixed(2)}% |`,
  );
}
