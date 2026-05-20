import { useState, useEffect } from "react";
import { fmt } from "../../utils/invoice.utils";
import { Card, PageHeader, LoadingScreen } from "../../components/ui";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:3000/api"
).trim();
function getCurrentFY() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 4
    ? `${y}-${String(y + 1).slice(2)}`
    : `${y - 1}-${String(y).slice(2)}`;
}

export default function GstR1Report() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fy, setFy] = useState(getCurrentFY());
  const [tab, setTab] = useState<"b2b" | "b2c">("b2b");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/reports/gst-r1?financialYear=${fy}`);
      setData(await res.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [fy]);

  function exportCSV(rows: any[], fname: string) {
    const headers = [
      "Invoice No",
      "Date",
      "Party",
      "GSTIN",
      "Taxable",
      "CGST",
      "SGST",
      "IGST",
      "Total Tax",
      "Grand Total",
    ];
    const csvRows = rows.map((r: any) => [
      r.invoiceNo,
      new Date(r.invoiceDate).toLocaleDateString("en-IN"),
      r.customer?.name || "",
      r.customerGstin || "",
      r.totalTaxable,
      r.cgstAmt,
      r.sgstAmt,
      r.igstAmt,
      r.totalTax,
      r.grandTotal,
    ]);
    const csv = [headers, ...csvRows]
      .map((r) =>
        r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = fname;
    a.click();
  }

  const rows = data?.[tab === "b2b" ? "b2b" : "b2c"] || [];
  const fys = [
    getCurrentFY(),
    ...(getCurrentFY() !== "2025-26" ? ["2025-26"] : []),
  ];

  return (
    <div>
      <PageHeader
        title="GST R1 Report"
        subtitle="Outward supplies — B2B & B2C"
      />
      <div className="flex items-center gap-3 mb-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 mr-2">
            Financial Year:
          </label>
          <select
            value={fy}
            onChange={(e) => setFy(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            {fys.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        {data && (
          <button
            onClick={() =>
              exportCSV(rows, `GST-R1-${tab.toUpperCase()}-${fy}.csv`)
            }
            className="px-3 py-2 text-xs font-semibold border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100"
          >
            ⬇ Export CSV
          </button>
        )}
      </div>

      {data && (
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            ["Total Invoices", data.summary.totalInvoices],
            ["B2B", data.summary.b2bCount],
            ["B2C", data.summary.b2cCount],
            ["Grand Total", `₹${fmt(data.summary.grandTotal)}`],
          ].map(([l, v]) => (
            <Card key={l} className="p-4">
              <p className="text-xs text-slate-500 mb-1">{l}</p>
              <p className="text-2xl font-bold text-slate-800">{v}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {(["b2b", "b2c"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${tab === t ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}
          >
            {t.toUpperCase()} (
            {data?.[t === "b2b" ? "b2b" : "b2c"]?.length || 0})
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingScreen />
      ) : (
        data && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    {[
                      "Invoice No",
                      "Date",
                      "Party",
                      "GSTIN",
                      "Taxable",
                      "CGST",
                      "SGST",
                      "IGST",
                      "Total Tax",
                      "Grand Total",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((inv: any) => (
                    <tr
                      key={inv.id}
                      className="border-b border-slate-50 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-mono text-blue-700 text-sm">
                        #{inv.invoiceNo}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800">
                        {inv.customer?.name}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {inv.customerGstin || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        ₹{fmt(inv.totalTaxable)}
                      </td>
                      <td className="px-4 py-3 text-sm">₹{fmt(inv.cgstAmt)}</td>
                      <td className="px-4 py-3 text-sm">₹{fmt(inv.sgstAmt)}</td>
                      <td className="px-4 py-3 text-sm">₹{fmt(inv.igstAmt)}</td>
                      <td className="px-4 py-3 text-sm">
                        ₹{fmt(inv.totalTax)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold">
                        ₹{fmt(inv.grandTotal)}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-10 text-center text-slate-400"
                      >
                        No records found
                      </td>
                    </tr>
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 font-bold border-t">
                      <td colSpan={4} className="px-4 py-3 text-sm">
                        Total ({rows.length} invoices)
                      </td>
                      <td className="px-4 py-3 text-sm">
                        ₹
                        {fmt(
                          rows.reduce(
                            (s: number, r: any) => s + r.totalTaxable,
                            0,
                          ),
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        ₹
                        {fmt(
                          rows.reduce((s: number, r: any) => s + r.cgstAmt, 0),
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        ₹
                        {fmt(
                          rows.reduce((s: number, r: any) => s + r.sgstAmt, 0),
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        ₹
                        {fmt(
                          rows.reduce((s: number, r: any) => s + r.igstAmt, 0),
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        ₹
                        {fmt(
                          rows.reduce((s: number, r: any) => s + r.totalTax, 0),
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-700">
                        ₹
                        {fmt(
                          rows.reduce(
                            (s: number, r: any) => s + r.grandTotal,
                            0,
                          ),
                        )}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        )
      )}
    </div>
  );
}
