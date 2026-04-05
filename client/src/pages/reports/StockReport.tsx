import { useEffect, useState } from "react";
import { reportApi } from "../../utils/api";
import { fmt } from "../../utils/invoice.utils";
import { Card, LoadingScreen, PageHeader } from "../../components/ui";
import { Pagination, usePagination } from "../../components/ui/Pagination";
import type { StockReportResponse } from "../../types";

const emptyData: StockReportResponse = {
  rows: [],
  summary: { totalBatches: 0, totalOpeningQty: 0, totalCurrentQty: 0 },
};

type StockFilter = "all" | "low" | "critical" | "out";

function getStatus(openingQty: number, currentQty: number) {
  if (openingQty === 0 && currentQty === 0) return "full"; // never stocked — neutral
  if (currentQty < 0) return "out"; // oversold/negative
  if (currentQty === 0 && openingQty > 0) return "out"; // fully sold out
  if (currentQty < openingQty * 0.25) return "critical"; // < 25% left
  if (currentQty < openingQty * 0.5) return "low"; // 25–50% left
  if (currentQty < openingQty) return "updated"; // partially sold
  return "full";
}

function exportCSV(data: StockReportResponse) {
  const headers = [
    "Item",
    "HSN",
    "Batch",
    "Expiry",
    "Opening Qty",
    "Sold",
    "Current Qty",
    "MRP",
    "Sale Price",
  ];
  const rows = data.rows.map((r) => [
    r.itemName,
    r.hsnCode,
    r.batchNo,
    r.expiryDate || "",
    r.openingQty,
    r.openingQty - r.currentQty,
    r.currentQty,
    r.mrp,
    r.salePrice,
  ]);
  const csv = [headers, ...rows]
    .map((row) =>
      row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "stock-report.csv";
  a.click();
}

function exportPDF(data: StockReportResponse) {
  const win = window.open("", "_blank")!;
  const s = data.summary;
  const trs = data.rows
    .map((r) => {
      const sold = r.openingQty - r.currentQty;
      const bg = r.currentQty <= 0 ? "#fee2e2" : sold > 0 ? "#eff6ff" : "";
      return `<tr style="background:${bg}"><td>${r.itemName}</td><td>${r.hsnCode}</td><td>${r.batchNo}</td><td>${r.expiryDate || "-"}</td><td>${fmt(r.openingQty)}</td><td style="color:#dc2626">${sold > 0 ? "-" + fmt(sold) : "—"}</td><td style="font-weight:bold">${fmt(r.currentQty)}</td><td>₹${fmt(r.mrp)}</td><td>₹${fmt(r.salePrice)}</td></tr>`;
    })
    .join("");
  win.document.write(
    `<html><head><title>Stock Report</title><style>body{font-family:Arial;font-size:11px;padding:20px}h2{margin-bottom:4px}p{color:#64748b;font-size:10px;margin-bottom:12px}.summary{display:flex;gap:12px;margin-bottom:12px}.scard{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px}.slabel{font-size:9px;color:#64748b}.sval{font-size:13px;font-weight:bold}table{width:100%;border-collapse:collapse}th{background:#f1f5f9;border:1px solid #cbd5e1;padding:6px 8px;text-align:left;font-size:10px}td{border:1px solid #e2e8f0;padding:5px 8px}</style></head><body><h2>Stock Report</h2><p>Fulanand Ayurved, Tasgaon</p><div class="summary"><div class="scard"><div class="slabel">Total Batches</div><div class="sval">${s.totalBatches}</div></div><div class="scard"><div class="slabel">Opening Qty</div><div class="sval">${fmt(s.totalOpeningQty)}</div></div><div class="scard"><div class="slabel">Current Qty</div><div class="sval">${fmt(s.totalCurrentQty)}</div></div></div><table><thead><tr><th>Item</th><th>HSN</th><th>Batch</th><th>Expiry</th><th>Opening</th><th>Sold</th><th>Current</th><th>MRP</th><th>Sale Price</th></tr></thead><tbody>${trs}</tbody></table></body></html>`,
  );
  win.document.close();
  win.print();
}

export default function StockReport() {
  const [data, setData] = useState<StockReportResponse>(emptyData);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StockFilter>("all");

  async function load() {
    setLoading(true);
    try {
      const res = await reportApi.getStockReport();
      setData(res);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Apply stock filter
  const filtered = data.rows.filter((row) => {
    const status = getStatus(row.openingQty, row.currentQty);
    if (filter === "out") return status === "out";
    if (filter === "critical") return status === "out" || status === "critical";
    if (filter === "low")
      return status === "out" || status === "critical" || status === "low";
    return true;
  });

  const pg = usePagination(filtered, 50);

  // Reset page when filter changes
  useEffect(() => {
    pg.reset();
  }, [filter]);

  function stockBadge(openingQty: number, currentQty: number) {
    const status = getStatus(openingQty, currentQty),
      sold = openingQty - currentQty;
    const styles: Record<string, string> = {
      out: "bg-red-100 text-red-700 border border-red-200",
      critical: "bg-orange-100 text-orange-700 border border-orange-200",
      low: "bg-yellow-100 text-yellow-700 border border-yellow-200",
      updated: "bg-blue-50 text-blue-700 border border-blue-200",
      full: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    };
    return (
      <div className="flex flex-col gap-0.5">
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block text-center ${styles[status]}`}
        >
          {currentQty < 0 ? `${currentQty}` : fmt(currentQty)}
        </span>
        {sold > 0 && (
          <span className="text-[10px] text-slate-400 text-center">
            -{fmt(sold)} sold
          </span>
        )}
        {currentQty < 0 && (
          <span className="text-[10px] text-red-600 font-bold text-center">
            {Math.abs(currentQty)} OVERSOLD
          </span>
        )}
        {currentQty === 0 && openingQty > 0 && (
          <span className="text-[10px] text-red-500 font-bold text-center">
            OUT OF STOCK
          </span>
        )}
      </div>
    );
  }

  function rowBg(openingQty: number, currentQty: number) {
    const s = getStatus(openingQty, currentQty);
    if (s === "out") return "bg-red-50/60 hover:bg-red-50";
    if (s === "critical") return "bg-orange-50/40 hover:bg-orange-50";
    if (s === "low") return "bg-yellow-50/30 hover:bg-yellow-50";
    if (s === "updated") return "bg-blue-50/20 hover:bg-blue-50/40";
    return "hover:bg-slate-50";
  }

  // Count by status
  const counts = {
    out: data.rows.filter(
      (r) => getStatus(r.openingQty, r.currentQty) === "out",
    ).length,
    critical: data.rows.filter((r) =>
      ["out", "critical"].includes(getStatus(r.openingQty, r.currentQty)),
    ).length,
    low: data.rows.filter((r) =>
      ["out", "critical", "low"].includes(
        getStatus(r.openingQty, r.currentQty),
      ),
    ).length,
  };

  return (
    <div>
      <PageHeader title="Stock Report" subtitle="Batch-wise available stock" />

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1">Total Batches</p>
          <p className="text-2xl font-bold text-slate-800">
            {data.summary.totalBatches}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1">Opening Qty</p>
          <p className="text-2xl font-bold text-slate-800">
            {fmt(data.summary.totalOpeningQty)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1">Current Qty</p>
          <p className="text-2xl font-bold text-slate-800">
            {fmt(data.summary.totalCurrentQty)}
          </p>
        </Card>
      </div>

      {/* Stock Filter Tabs */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {(
          [
            {
              key: "all",
              label: "All Stock",
              color: "bg-slate-100 text-slate-700",
              active: "bg-slate-800 text-white",
            },
            {
              key: "low",
              label: `Low Stock (${counts.low})`,
              color: "bg-yellow-50 text-yellow-700",
              active: "bg-yellow-500 text-white",
            },
            {
              key: "critical",
              label: `Critical (${counts.critical})`,
              color: "bg-orange-50 text-orange-700",
              active: "bg-orange-500 text-white",
            },
            {
              key: "out",
              label: `Out of Stock (${counts.out})`,
              color: "bg-red-50 text-red-700",
              active: "bg-red-500 text-white",
            },
          ] as {
            key: StockFilter;
            label: string;
            color: string;
            active: string;
          }[]
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${filter === f.key ? f.active : f.color + " hover:opacity-80"}`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          {data.rows.length > 0 && (
            <>
              <button
                onClick={() => exportCSV(data)}
                className="px-3 py-1.5 text-xs font-semibold border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100"
              >
                ⬇ CSV
              </button>
              <button
                onClick={() => exportPDF(data)}
                className="px-3 py-1.5 text-xs font-semibold border border-blue-200 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                🖨 PDF
              </button>
            </>
          )}
        </div>
      </div>

      <Card>
        {loading ? (
          <LoadingScreen />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    {[
                      "Item",
                      "HSN",
                      "Batch",
                      "Expiry",
                      "Opening Qty",
                      "Sold",
                      "Current Qty",
                      "MRP",
                      "Sale Price",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-semibold text-slate-500 px-5 py-3 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pg.paginated.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-50 transition-colors ${rowBg(row.openingQty, row.currentQty)}`}
                    >
                      <td className="px-5 py-3 text-sm font-medium text-slate-800">
                        {row.itemName}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500">
                        {row.hsnCode}
                      </td>
                      <td className="px-5 py-3 text-sm font-mono font-semibold text-blue-700">
                        {row.batchNo}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {row.expiryDate || "-"}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {fmt(row.openingQty)}
                      </td>
                      <td className="px-5 py-3 text-sm">
                        {row.openingQty - row.currentQty > 0 ? (
                          <span className="text-red-600 font-semibold">
                            -{fmt(row.openingQty - row.currentQty)}
                          </span>
                        ) : row.currentQty < 0 ? (
                          <span className="text-red-700 font-bold">
                            -{fmt(row.openingQty - row.currentQty)} ⚠
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {stockBadge(row.openingQty, row.currentQty)}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-700">
                        ₹{fmt(row.mrp)}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-700">
                        ₹{fmt(row.salePrice)}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-5 py-10 text-center text-sm text-slate-500"
                      >
                        {filter === "out"
                          ? "✓ No out of stock items"
                          : filter === "critical"
                            ? "✓ No critical stock items"
                            : "No stock found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filtered.length > 0 && (
              <Pagination
                total={pg.total}
                page={pg.page}
                perPage={pg.perPage}
                from={pg.from}
                to={pg.to}
                onPage={pg.setPage}
                onPerPage={pg.onPerPage}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}
