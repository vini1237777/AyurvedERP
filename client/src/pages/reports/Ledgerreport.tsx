import { useState, useEffect } from "react";
import { fmt } from "../../utils/invoice.utils";
import { Card, PageHeader, LoadingScreen } from "../../components/ui";
import { customerApi } from "../../utils/api";
import type { Customer } from "../../types";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:3000/api"
).trim();

export default function LedgerReport() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(`${new Date().getFullYear()}-04-01`);
  const [to, setTo] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    customerApi.getAll().then(setCustomers).catch(console.error);
  }, []);

  async function load() {
    if (!selectedId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/reports/ledger?customerId=${selectedId}&from=${from}&to=${to}`,
      );
      setData(await res.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Party-wise Ledger"
        subtitle="Account statement for a party"
      />
      <Card className="mb-4 p-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              Select Party
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search party..."
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:border-blue-500 mb-1"
            />
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:border-blue-500 h-40"
            >
              <option value="">-- Select --</option>
              {filtered.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
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
            <button
              onClick={load}
              className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              Show Ledger
            </button>
          </div>
        </div>
      </Card>

      {loading ? (
        <LoadingScreen />
      ) : (
        data && (
          <Card>
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">
                {data.customer?.name}
              </h2>
              <p className="text-xs text-slate-500">
                {data.customer?.address} |{" "}
                {data.customer?.gstin || "Unregistered"}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    {[
                      "Date",
                      "Invoice No",
                      "Type",
                      "Debit (Dr)",
                      "Credit (Cr)",
                      "Balance",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-semibold text-slate-500 px-4 py-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows?.map((row: any, i: number) => (
                    <tr
                      key={i}
                      className="border-b border-slate-50 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {new Date(row.date).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 font-mono text-blue-700 text-sm">
                        #{row.invoiceNo}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {row.type}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.debit > 0 ? `₹${fmt(row.debit)}` : ""}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.credit > 0 ? `₹${fmt(row.credit)}` : ""}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold">
                        {row.balance >= 0 ? (
                          <span className="text-red-600">
                            ₹{fmt(row.balance)} Dr.
                          </span>
                        ) : (
                          <span className="text-emerald-600">
                            ₹{fmt(Math.abs(row.balance))} Cr.
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={5} className="px-4 py-3 text-sm text-right">
                      Closing Balance:
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-blue-700">
                      ₹{fmt(data.closingBalance)} Dr.
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )
      )}
    </div>
  );
}
