import { useEffect, useState } from "react";
import { Card, PageHeader, LoadingScreen } from "../../components/ui";
import { fmt, fmtInt } from "../../utils/invoice.utils";
import { authFetch } from "../../utils/api";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).trim();

type Row = {
  hsnCode: string;
  description: string;
  gstPercent: number;
  totalQty: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  invoiceCount: number;
};

type HsnResponse = {
  rows: Row[];
  summary: {
    hsnCount: number;
    totalTaxable: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    totalTax: number;
    grandTotal: number;
  };
};

export default function HsnSummary() {
  const [from, setFrom] = useState(`${new Date().getFullYear()}-04-01`);
  const [to, setTo] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<HsnResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await authFetch(
        `${API}/reports/hsn-summary?from=${from}&to=${to}`,
      );
      setData(await res.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exportCSV() {
    if (!data) return;
    const headers = [
      "HSN Code",
      "Description",
      "GST %",
      "Total Qty",
      "Invoices",
      "Taxable",
      "CGST",
      "SGST",
      "IGST",
      "Total",
    ];
    const csvRows = data.rows.map((r) => [
      r.hsnCode,
      r.description,
      r.gstPercent,
      r.totalQty,
      r.invoiceCount,
      r.taxable,
      r.cgst,
      r.sgst,
      r.igst,
      r.total,
    ]);
    const csv = [headers, ...csvRows]
      .map((row) =>
        row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `HSN-Summary-${from}-to-${to}.csv`;
    a.click();
  }

  return (
    <div>
      <PageHeader
        title="HSN Summary"
        subtitle="GSTR-1 §12 · HSN-wise outward supplies"
      />

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              From
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              To
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={load}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Refresh
          </button>
          {data && (
            <button
              onClick={exportCSV}
              className="px-3 py-2 text-xs font-semibold border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100"
            >
              Export CSV
            </button>
          )}
        </div>
      </Card>

      {data && (
        <div className="grid grid-cols-5 gap-4 mb-4">
          {[
            ["HSN Codes", fmtInt(data.summary.hsnCount)],
            ["Total Taxable", `₹${fmt(data.summary.totalTaxable)}`],
            ["CGST + SGST", `₹${fmt(data.summary.totalCgst + data.summary.totalSgst)}`],
            ["IGST", `₹${fmt(data.summary.totalIgst)}`],
            ["Grand Total", `₹${fmt(data.summary.grandTotal)}`],
          ].map(([l, v]) => (
            <Card key={l} className="p-4">
              <p className="text-xs text-slate-500 mb-1">{l}</p>
              <p className="text-xl font-bold text-slate-800">{v}</p>
            </Card>
          ))}
        </div>
      )}

      {loading && <LoadingScreen />}

      {!loading && data && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {[
                    "HSN",
                    "Description",
                    "GST %",
                    "Total Qty",
                    "Invoices",
                    "Taxable",
                    "CGST",
                    "SGST",
                    "IGST",
                    "Total",
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider ${i >= 3 ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="text-center py-12 text-slate-400 text-sm"
                    >
                      No outward supplies in this period.
                    </td>
                  </tr>
                )}
                {data.rows.map((r) => (
                  <tr
                    key={`${r.hsnCode}-${r.gstPercent}`}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-2.5 font-mono text-slate-700 text-xs">
                      {r.hsnCode}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 text-xs">
                      {r.description || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{r.gstPercent}%</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                      {fmtInt(r.totalQty)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-500">
                      {r.invoiceCount}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      ₹{fmt(r.taxable)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {r.cgst > 0 ? `₹${fmt(r.cgst)}` : ""}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {r.sgst > 0 ? `₹${fmt(r.sgst)}` : ""}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {r.igst > 0 ? `₹${fmt(r.igst)}` : ""}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-800">
                      ₹{fmt(r.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {data.rows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-semibold border-t-2 border-slate-300">
                    <td colSpan={5} className="px-4 py-3 text-slate-700">
                      Total
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900">
                      ₹{fmt(data.summary.totalTaxable)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900">
                      ₹{fmt(data.summary.totalCgst)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900">
                      ₹{fmt(data.summary.totalSgst)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900">
                      ₹{fmt(data.summary.totalIgst)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900">
                      ₹{fmt(data.summary.grandTotal)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
