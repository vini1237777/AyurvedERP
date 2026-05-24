import { useEffect, useState } from "react";
import { Card, PageHeader, LoadingScreen } from "../../components/ui";
import { fmt } from "../../utils/invoice.utils";
import { authFetch } from "../../utils/api";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).trim();

type Row = {
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
};

type TBResponse = {
  rows: Row[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
  difference: number;
};

const TYPE_COLORS: Record<string, string> = {
  ASSET: "text-emerald-700 bg-emerald-50",
  LIABILITY: "text-amber-700 bg-amber-50",
  EQUITY: "text-purple-700 bg-purple-50",
  INCOME: "text-blue-700 bg-blue-50",
  EXPENSE: "text-rose-700 bg-rose-50",
};

export default function TrialBalance() {
  const [from, setFrom] = useState(`${new Date().getFullYear()}-04-01`);
  const [to, setTo] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<TBResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await authFetch(
        `${API}/reports/trial-balance?from=${from}&to=${to}`,
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

  return (
    <div>
      <PageHeader
        title="Trial Balance"
        subtitle="Debit vs credit summary across every active account"
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
            <div
              className={`text-xs font-semibold px-3 py-2 rounded-lg border text-center ${
                data.balanced
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
              title="Double-entry audit"
            >
              {data.balanced ? (
                <>✓ Balanced — Double-entry audit</>
              ) : (
                <>✗ Out of balance by ₹{fmt(Math.abs(data.difference))}</>
              )}
            </div>
          )}
        </div>
      </Card>

      {loading && <LoadingScreen />}

      {!loading && data && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    Code
                  </th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    Account
                  </th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-right px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    Debit (Dr)
                  </th>
                  <th className="text-right px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    Credit (Cr)
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-12 text-slate-400 text-sm"
                    >
                      No postings in this period yet.
                    </td>
                  </tr>
                )}
                {data.rows.map((r) => (
                  <tr
                    key={r.code}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-2.5 font-mono text-slate-500 text-xs">
                      {r.code}
                    </td>
                    <td className="px-4 py-2.5 text-slate-800 font-medium">
                      {r.name}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${TYPE_COLORS[r.type] || "text-slate-600 bg-slate-100"}`}
                      >
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-800">
                      {r.debit > 0 ? `₹${fmt(r.debit)}` : ""}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-800">
                      {r.credit > 0 ? `₹${fmt(r.credit)}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-semibold border-t-2 border-slate-300">
                  <td colSpan={3} className="px-4 py-3 text-slate-700">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-900">
                    ₹{fmt(data.totalDebit)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-900">
                    ₹{fmt(data.totalCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
