import { useEffect, useState } from "react";
import { reportApi } from "../../utils/api";
import { fmt } from "../../utils/invoice.utils";
import { Card, LoadingScreen, PageHeader } from "../../components/ui";
import type { StockReportResponse } from "../../types";

const emptyData: StockReportResponse = {
  rows: [],
  summary: { totalBatches: 0, totalOpeningQty: 0, totalCurrentQty: 0 },
};
type StockFilter = "all" | "low" | "critical" | "out";
type GroupBy = "none" | "company";

function getStatus(openingQty: number, currentQty: number) {
  if (openingQty === 0 && currentQty === 0) return "full";
  if (currentQty < 0) return "out";
  if (currentQty === 0 && openingQty > 0) return "out";
  if (currentQty < openingQty * 0.25) return "critical";
  if (currentQty < openingQty * 0.5) return "low";
  if (currentQty < openingQty) return "updated";
  return "full";
}

function getCompany(itemName: string) {
  // Extract company from item name — usually after last "-" or in parentheses
  const parts = itemName.split("-");
  if (parts.length > 1) return parts[parts.length - 1].trim();
  return "Other";
}

export default function StockReport() {
  const [data, setData] = useState<StockReportResponse>(emptyData);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StockFilter>("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [search, setSearch] = useState("");

  useEffect(() => {
    reportApi
      .getStockReport()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const base = data.rows.filter((row) => {
    if (search && !row.itemName.toLowerCase().includes(search.toLowerCase()))
      return false;
    const status = getStatus(row.openingQty, row.currentQty);
    if (filter === "out") return status === "out";
    if (filter === "critical") return ["out", "critical"].includes(status);
    if (filter === "low") return ["out", "critical", "low"].includes(status);
    return true;
  });

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

  // Group by company
  const grouped =
    groupBy === "company"
      ? base.reduce((acc: Record<string, typeof base>, row) => {
          const c = getCompany(row.itemName);
          (acc[c] = acc[c] || []).push(row);
          return acc;
        }, {})
      : { "All Items": base };

  function stockBadge(o: number, c: number) {
    const s = getStatus(o, c);
    const styles: Record<string, string> = {
      out: "bg-red-100 text-red-700",
      critical: "bg-orange-100 text-orange-700",
      low: "bg-yellow-100 text-yellow-700",
      updated: "bg-blue-50 text-blue-700",
      full: "bg-emerald-50 text-emerald-700",
    };
    return (
      <span
        className={`text-xs font-bold px-2 py-0.5 rounded-full ${styles[s]}`}
      >
        {c < 0 ? c : fmt(c)}
      </span>
    );
  }

  function exportCSV() {
    const headers = [
      "Item",
      "Batch",
      "Expiry",
      "Opening",
      "Sold",
      "Closing",
      "MRP",
      "Sale Price",
    ];
    const rows = base.map((r) => [
      r.itemName,
      r.batchNo,
      r.expiryDate || "",
      r.openingQty,
      r.openingQty - r.currentQty,
      r.currentQty,
      r.mrp,
      r.salePrice,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "stock-report.csv";
    a.click();
  }

  return (
    <div>
      <PageHeader
        title="Stock Report"
        subtitle="Opening, Closing & Batch-wise stock"
      />

      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          ["Total Batches", data.summary.totalBatches],
          ["Opening Qty", fmt(data.summary.totalOpeningQty)],
          ["Closing Qty", fmt(data.summary.totalCurrentQty)],
        ].map(([l, v]) => (
          <Card key={l} className="p-4">
            <p className="text-xs text-slate-500 mb-1">{l}</p>
            <p className="text-2xl font-bold text-slate-800">{v}</p>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {(
          [
            {
              key: "all",
              label: "All Stock",
              a: "bg-slate-800 text-white",
              i: "bg-slate-100 text-slate-700",
            },
            {
              key: "low",
              label: `Low (${counts.low})`,
              a: "bg-yellow-500 text-white",
              i: "bg-yellow-50 text-yellow-700",
            },
            {
              key: "critical",
              label: `Critical (${counts.critical})`,
              a: "bg-orange-500 text-white",
              i: "bg-orange-50 text-orange-700",
            },
            {
              key: "out",
              label: `Out of Stock (${counts.out})`,
              a: "bg-red-500 text-white",
              i: "bg-red-50 text-red-700",
            },
          ] as any[]
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${filter === f.key ? f.a : f.i}`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-4 flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">
            Group by:
          </span>
          <button
            onClick={() =>
              setGroupBy((g) => (g === "none" ? "company" : "none"))
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${groupBy === "company" ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}
          >
            Company
          </button>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search item..."
          className="ml-auto border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-500 w-48"
        />
        <button
          onClick={exportCSV}
          className="px-3 py-1.5 text-xs font-semibold border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100"
        >
          ⬇ CSV
        </button>
      </div>

      <Card>
        {loading ? (
          <LoadingScreen />
        ) : (
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
                    "Closing Qty",
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
                {Object.entries(grouped).map(([company, rows]) => (
                  <>
                    {groupBy === "company" && (
                      <tr key={`h-${company}`}>
                        <td
                          colSpan={9}
                          className="px-5 py-2 bg-blue-50 text-blue-800 text-xs font-bold border-b border-blue-100"
                        >
                          {company} ({rows.length} batches)
                        </td>
                      </tr>
                    )}
                    {rows.map((row: any) => {
                      const sold = row.openingQty - row.currentQty;
                      const s = getStatus(row.openingQty, row.currentQty);
                      const bg =
                        s === "out"
                          ? "bg-red-50/60"
                          : s === "critical"
                            ? "bg-orange-50/40"
                            : s === "low"
                              ? "bg-yellow-50/30"
                              : "";
                      return (
                        <tr
                          key={row.id}
                          className={`border-b border-slate-50 hover:bg-slate-50 ${bg}`}
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
                            {sold > 0 ? (
                              <span className="text-red-600 font-semibold">
                                -{fmt(sold)}
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
                      );
                    })}
                  </>
                ))}
                {base.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-10 text-center text-sm text-slate-400"
                    >
                      No stock found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
