import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { invoiceApi, salesReturnApi, authFetch } from "../utils/api";
import { fmt, fmtDate, fmtQty } from "../utils/invoice.utils";
import { Card, Badge, LoadingScreen } from "../components/ui";
import { useAuth } from "../auth/AuthContext";
import type { Invoice } from "../types";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).trim();

interface SalesReturn {
  id: number;
  returnNo: number;
  invoiceId: number;
  customerId: number;
  totalCredit: number;
  createdAt: string;
  customer?: {
    name: string;
  };
}

type DashboardSummary = {
  outstanding: number;
  invoiceCount: number;
  todayNet: number;
  monthNet: number;
  todayReturns: number;
  monthReturns: number;
  lowStockCount: number;
  expiringCount: number;
  expiredCount: number;
  gstPayable: number;
  topCustomers: { customerId: number; name: string; total: number }[];
};

const plural = (n: number, one: string, many: string) =>
  `${fmtQty(n)} ${n === 1 ? one : many}`;

export default function Dashboard() {
  const { user } = useAuth();
  const role = (user as { role?: string } | null)?.role;
  const canSell = role === "ADMIN" || role === "SELLER";
  const canSeeBatches = role === "ADMIN" || role === "ACCOUNTANT";

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryFailed, setSummaryFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const page = await invoiceApi.getAll({ limit: 5 });
        setInvoices(page.rows || []);
      } catch (err) {
        console.error("Failed to load invoices", err);
      }

      try {
        const returnData = await salesReturnApi.getAll();
        setReturns(returnData || []);
      } catch (err) {
        console.error("Failed to load sales returns", err);
        setReturns([]);
      }

      try {
        const res = await authFetch(`${API}/reports/dashboard-summary`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        setSummary(await res.json());
      } catch (err) {
        console.error("Failed to load dashboard summary", err);
        setSummaryFailed(true);
      }

      setLoading(false);
    }

    loadDashboard();
  }, []);

  const money = (n: number | undefined) =>
    summary ? `₹${fmt(n ?? 0)}` : summaryFailed ? "Not available" : "...";

  const figures = [
    {
      label: "Today's sales",
      value: money(summary?.todayNet),
      note: summary?.todayReturns
        ? `After ₹${fmt(summary.todayReturns)} returns`
        : "No returns today",
    },
    {
      label: "This month",
      value: money(summary?.monthNet),
      note: summary?.monthReturns
        ? `After ₹${fmt(summary.monthReturns)} returns`
        : "No returns this month",
    },
    {
      // Payments aren't recorded anywhere yet, so this can't claim to be money owed.
      label: "Total billed",
      value: money(summary?.outstanding),
      note: summary
        ? `${plural(summary.invoiceCount, "invoice", "invoices")}, all time`
        : "",
    },
    {
      label: summary && summary.gstPayable < 0 ? "GST credit" : "GST payable",
      value: money(summary ? Math.abs(summary.gstPayable) : undefined),
      note: "Tax on sales minus tax on purchases",
    },
  ];

  const attention = summary
    ? [
        {
          count: summary.expiredCount,
          text: `${plural(summary.expiredCount, "batch has", "batches have")} expired with stock left`,
          to: "/masters/batches?stock=expired",
          urgent: true,
        },
        {
          count: summary.expiringCount,
          text: `${plural(summary.expiringCount, "batch expires", "batches expire")} within 90 days`,
          to: "/masters/batches?stock=expiring",
          urgent: false,
        },
        {
          count: summary.lowStockCount,
          text: `${plural(summary.lowStockCount, "batch has", "batches have")} fewer than 10 left`,
          to: "/masters/batches?stock=below10",
          urgent: false,
        },
      ].filter((row) => row.count > 0)
    : [];

  const shortcuts = [
    { label: "Sale return", to: "/sales/return", show: canSell },
    { label: "Customers", to: "/masters/customers", show: role !== "RETAILER" },
    { label: "Items", to: "/masters/items", show: role !== "RETAILER" },
    { label: "Batches", to: "/masters/batches", show: canSeeBatches },
  ].filter((s) => s.show);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        {canSell && (
          <Link
            to="/sales/new"
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
          >
            + New sale
          </Link>
        )}
      </div>

      <p className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800">
        Demo data. These are made-up business records, not a real client's.
      </p>

      <Card className="mb-5 grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-100">
        {figures.map((f) => (
          <div key={f.label} className="px-5 py-4 min-w-0">
            <p className="text-sm text-slate-600">{f.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-800 [font-variant-numeric:tabular-nums] break-words">
              {f.value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{f.note}</p>
          </div>
        ))}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card>
          <h2 className="px-5 pt-4 pb-3 font-semibold text-slate-800 border-b border-slate-100">
            Needs attention
          </h2>
          {loading ? (
            <LoadingScreen />
          ) : summaryFailed ? (
            <p className="px-5 py-6 text-sm text-red-600">
              Stock alerts couldn't be loaded. Refresh the page to try again.
            </p>
          ) : attention.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-600">
              Nothing right now. Stock and expiry dates look fine.
            </p>
          ) : (
            <ul>
              {attention.map((row) => (
                <li
                  key={row.to}
                  className="border-b border-slate-50 last:border-0"
                >
                  {canSeeBatches ? (
                    <Link
                      to={row.to}
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50"
                    >
                      <span
                        className={`text-sm ${row.urgent ? "font-semibold text-red-700" : "text-slate-800"}`}
                      >
                        {row.text}
                      </span>
                      <span className="text-sm text-blue-700 whitespace-nowrap">
                        View batches
                      </span>
                    </Link>
                  ) : (
                    <p
                      className={`px-5 py-3 text-sm ${row.urgent ? "font-semibold text-red-700" : "text-slate-800"}`}
                    >
                      {row.text}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="px-5 pt-4 pb-3 font-semibold text-slate-800 border-b border-slate-100">
            Top customers
          </h2>
          {loading ? (
            <LoadingScreen />
          ) : !summary?.topCustomers.length ? (
            <p className="px-5 py-6 text-sm text-slate-600">No invoices yet.</p>
          ) : (
            <ol>
              {summary.topCustomers.slice(0, 3).map((c) => (
                <li
                  key={c.customerId}
                  className="flex items-baseline justify-between gap-3 px-5 py-3 border-b border-slate-50 last:border-0 text-sm"
                >
                  <span className="truncate text-slate-800">{c.name}</span>
                  <span className="num font-semibold text-slate-800">
                    ₹{fmt(c.total)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Recent invoices</h2>
            <Link to="/sales" className="text-sm text-blue-700 hover:underline">
              View all
            </Link>
          </div>

          {loading ? (
            <LoadingScreen />
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-sm">
              No invoices yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs font-semibold text-slate-600">
                    <th scope="col" className="text-left px-5 py-2.5">
                      Invoice
                    </th>
                    <th scope="col" className="text-left px-3 py-2.5">
                      Date
                    </th>
                    <th scope="col" className="text-left px-3 py-2.5">
                      Customer
                    </th>
                    <th scope="col" className="text-right px-5 py-2.5">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-slate-50 hover:bg-slate-50"
                    >
                      <td className="px-5 py-2.5 text-sm font-mono font-semibold text-blue-700 whitespace-nowrap">
                        {inv.invoiceNo}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-slate-600 whitespace-nowrap">
                        {fmtDate(inv.invoiceDate)}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-slate-800">
                        {inv.customer?.name}
                        {inv.status !== "SAVED" && (
                          <span className="ml-2">
                            <Badge color="red">Cancelled</Badge>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-sm font-semibold text-slate-800 num">
                        ₹{fmt(inv.grandTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Recent returns</h2>
          </div>

          {loading ? (
            <LoadingScreen />
          ) : returns.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-sm">
              No returns yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs font-semibold text-slate-600">
                    <th scope="col" className="text-left px-5 py-2.5">
                      Return
                    </th>
                    <th scope="col" className="text-left px-3 py-2.5">
                      Date
                    </th>
                    <th scope="col" className="text-left px-3 py-2.5">
                      Customer
                    </th>
                    <th scope="col" className="text-right px-5 py-2.5">
                      Credit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {returns.slice(0, 5).map((ret) => (
                    <tr
                      key={ret.id}
                      className="border-b border-slate-50 hover:bg-slate-50"
                    >
                      <td className="px-5 py-2.5 text-sm font-mono font-semibold text-slate-700 whitespace-nowrap">
                        SR-{ret.returnNo}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-slate-600 whitespace-nowrap">
                        {fmtDate(ret.createdAt)}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-slate-800">
                        {ret.customer?.name || "-"}
                      </td>
                      <td className="px-5 py-2.5 text-sm font-semibold text-slate-800 num">
                        ₹{fmt(ret.totalCredit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {shortcuts.length > 0 && (
        <nav
          aria-label="Shortcuts"
          className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-600"
        >
          <span>Go to</span>
          {shortcuts.map((s) => (
            <Link key={s.to} to={s.to} className="text-blue-700 hover:underline">
              {s.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
