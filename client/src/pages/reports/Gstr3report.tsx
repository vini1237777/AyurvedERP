import { useState, useEffect } from "react";
import { fmt } from "../../utils/invoice.utils";
import { Card, PageHeader, LoadingScreen } from "../../components/ui";
import { authFetch } from "../../utils/api";

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

export default function GstR3Report() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fy, setFy] = useState(getCurrentFY());

  async function load() {
    setLoading(true);
    try {
      const res = await authFetch(`${API}/reports/gst-r3?financialYear=${fy}`);
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

  const fys = [getCurrentFY(), "2025-26"].filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  const s = data?.summary;

  return (
    <div>
      <PageHeader
        title="GST R3B Report"
        subtitle="Summary return — outward supplies"
      />
      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs font-semibold text-slate-500">
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

      {loading ? (
        <LoadingScreen />
      ) : (
        s && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                ["Total Invoices", s.totalInvoices],
                ["Taxable Amount", `₹${fmt(s.taxable)}`],
                ["Total Tax", `₹${fmt(s.totalTax)}`],
              ].map(([l, v]) => (
                <Card key={l} className="p-4">
                  <p className="text-xs text-slate-500 mb-1">{l}</p>
                  <p className="text-2xl font-bold text-slate-800">{v}</p>
                </Card>
              ))}
            </div>

            <Card>
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-700">
                  3.1 Outward Taxable Supplies
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      {[
                        "Description",
                        "Taxable Value",
                        "Integrated Tax",
                        "Central Tax",
                        "State/UT Tax",
                        "Cess",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left text-xs font-semibold text-slate-500 px-5 py-3"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-slate-50">
                      <td className="px-5 py-4 text-sm font-medium">
                        Outward taxable supplies (other than zero rated, nil and
                        exempted)
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-800">
                        ₹{fmt(s.taxable)}
                      </td>
                      <td className="px-5 py-4 text-sm">₹{fmt(s.igst)}</td>
                      <td className="px-5 py-4 text-sm">₹{fmt(s.cgst)}</td>
                      <td className="px-5 py-4 text-sm">₹{fmt(s.sgst)}</td>
                      <td className="px-5 py-4 text-sm text-slate-400">
                        ₹0.00
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-50 font-bold">
                      <td className="px-5 py-3 text-sm">Total</td>
                      <td className="px-5 py-3 text-sm text-blue-700">
                        ₹{fmt(s.taxable)}
                      </td>
                      <td className="px-5 py-3 text-sm text-blue-700">
                        ₹{fmt(s.igst)}
                      </td>
                      <td className="px-5 py-3 text-sm text-blue-700">
                        ₹{fmt(s.cgst)}
                      </td>
                      <td className="px-5 py-3 text-sm text-blue-700">
                        ₹{fmt(s.sgst)}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-400">
                        ₹0.00
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>

            <Card>
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-700">
                  4. Eligible ITC (Input Tax Credit)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  From {s.totalPurchases} purchases
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      {[
                        "Description",
                        "Taxable Value",
                        "Integrated Tax",
                        "Central Tax",
                        "State/UT Tax",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left text-xs font-semibold text-slate-500 px-5 py-3"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-5 py-4 text-sm font-medium">
                        ITC available — inward supplies
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-800">
                        ₹{fmt(data.itc.taxable)}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        ₹{fmt(data.itc.igst)}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        ₹{fmt(data.itc.cgst)}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        ₹{fmt(data.itc.sgst)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-5 bg-blue-50/50 border-blue-200">
              <h2 className="font-semibold text-slate-700 mb-1">
                6.1 Net Tax Payable
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Output tax − Eligible ITC (clamped at zero per head)
              </p>
              <div className="grid grid-cols-4 gap-4 text-sm">
                {[
                  ["IGST", data.netPayable.igst],
                  ["CGST", data.netPayable.cgst],
                  ["SGST/UTGST", data.netPayable.sgst],
                  ["Total Payable", data.netPayable.total],
                ].map(([l, v], i) => (
                  <div
                    key={l}
                    className={`rounded-xl p-4 ${i === 3 ? "bg-blue-600 text-white" : "bg-white border border-slate-200"}`}
                  >
                    <div
                      className={`text-xs mb-1 ${i === 3 ? "text-blue-100" : "text-slate-500"}`}
                    >
                      {l}
                    </div>
                    <div className="text-xl font-bold">
                      ₹{fmt(Number(v))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )
      )}
    </div>
  );
}
