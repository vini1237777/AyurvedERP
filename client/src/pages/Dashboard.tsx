import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { invoiceApi, salesReturnApi, authFetch } from "../utils/api";
import { fmt, fmtInt } from "../utils/invoice.utils";
import { Card, Badge, LoadingScreen } from "../components/ui";
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
  lowStockCount: number;
  lowStock: { itemName: string; batchNo: string; currentQty: number }[];
  expiringCount: number;
  expiring: {
    itemName: string;
    batchNo: string;
    expiryDate: string;
    currentQty: number;
  }[];
  gstPayable: number;
  gstOutput: number;
  gstInput: number;
  topCustomers: { customerId: number; name: string; total: number }[];
};

export default function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
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
        if (res.ok) setSummary(await res.json());
      } catch (err) {
        console.error("Failed to load dashboard summary", err);
      }

      setLoading(false);
    }

    loadDashboard();
  }, []);

  const isToday = (dateStr: string) =>
    new Date(dateStr).toDateString() === new Date().toDateString();

  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  };

  const todaySales = invoices
    .filter((i) => isToday(i.invoiceDate) && i.status !== "CANCELLED")
    .reduce((s, i) => s + i.grandTotal, 0);

  const todayReturns = returns
    .filter((r) => isToday(r.createdAt))
    .reduce((s, r) => s + r.totalCredit, 0);

  const todayNet = todaySales - todayReturns;

  const monthSales = invoices
    .filter((i) => isThisMonth(i.invoiceDate) && i.status !== "CANCELLED")
    .reduce((s, i) => s + i.grandTotal, 0);

  const monthReturns = returns
    .filter((r) => isThisMonth(r.createdAt))
    .reduce((s, r) => s + r.totalCredit, 0);

  const monthNet = monthSales - monthReturns;

  const recentInvoices = invoices.slice(0, 3);
  const recentReturns = returns.slice(0, 5);

  const stats = [
    {
      label: "Today's Net Sales",
      value: `₹${fmt(todayNet)}`,
    },
    {
      label: "This Month Net",
      value: `₹${fmt(monthNet)}`,
    },
    {
      label: "Total Invoices",
      value: String(invoices.length),
    },
    {
      label: "Today's Returns",
      value: `₹${fmt(todayReturns)}`,
    },
    {
      label: "This Month Returns",
      value: `₹${fmt(monthReturns)}`,
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Welcome to ERP</p>
      </div>

      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-blue-900">Demo data</div>
          <p className="text-sm text-blue-700">
            This preview uses seeded mock business records. No client data is
            shown.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200 whitespace-nowrap">
          Portfolio preview
        </span>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div>
              <p className="text-sm text-slate-500 mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {summary && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <Card className="p-5">
            <p className="text-sm text-slate-500 mb-1">Outstanding Amount</p>
            <p className="text-2xl font-bold text-slate-800">
              ₹{fmt(summary.outstanding)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Σ unpaid SAVED invoices
            </p>
          </Card>

          <Card className="p-5">
            <p className="text-sm text-slate-500 mb-1">Low Stock</p>
            <p className="text-2xl font-bold text-amber-700">
              {fmtInt(summary.lowStockCount)}
            </p>
            <p className="text-xs text-slate-400 mt-1">batches below 10 qty</p>
          </Card>

          <Card className="p-5">
            <p className="text-sm text-slate-500 mb-1">Expiring Batches</p>
            <p className="text-2xl font-bold text-rose-700">
              {fmtInt(summary.expiringCount)}
            </p>
            <p className="text-xs text-slate-400 mt-1">within next 90 days</p>
          </Card>

          <Card className="p-5">
            <p className="text-sm text-slate-500 mb-1">GST Payable</p>
            <p
              className={`text-2xl font-bold ${
                summary.gstPayable >= 0 ? "text-slate-800" : "text-emerald-700"
              }`}
            >
              ₹{fmt(Math.abs(summary.gstPayable))}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Output ₹{fmt(summary.gstOutput)} − Input ₹{fmt(summary.gstInput)}
            </p>
          </Card>

          <Card className="p-5">
            <p className="text-sm text-slate-500 mb-2">Top Customers</p>
            {summary.topCustomers.length === 0 ? (
              <p className="text-xs text-slate-400">No invoiced customers</p>
            ) : (
              <ol className="space-y-1">
                {summary.topCustomers.slice(0, 3).map((c, i) => (
                  <li
                    key={c.customerId}
                    className="flex items-baseline justify-between gap-2 text-xs"
                  >
                    <span className="truncate text-slate-700">
                      <span className="text-slate-400 font-mono mr-1">
                        {i + 1}.
                      </span>
                      {c.name}
                    </span>
                    <span className="font-semibold text-slate-800 whitespace-nowrap">
                      ₹{fmt(c.total)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      )}

      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          {
            label: "New Sale",
            path: "/sales/new",
            icon: "➕",
            color: "bg-blue-600",
          },
          {
            label: "Sales Return",
            path: "/sales/return",
            icon: "↩",
            color: "bg-rose-600",
          },
          {
            label: "Customers",
            path: "/masters/customers",
            icon: "",
            color: "bg-emerald-600",
          },
          {
            label: "Items",
            path: "/masters/items",
            icon: "",
            color: "bg-violet-600",
          },
          {
            label: "Batches",
            path: "/masters/batches",
            icon: "",
            color: "bg-amber-600",
          },
        ].map((a) => (
          <Link
            key={a.path}
            to={a.path}
            className={`${a.color} text-white rounded-xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity`}
          >
            <span className="text-2xl">{a.icon}</span>
            <span className="font-semibold text-sm">{a.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Recent Invoices</h2>
            <Link to="/sales" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>

          {loading ? (
            <LoadingScreen />
          ) : recentInvoices.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No invoices yet.{" "}
              <Link to="/sales/new" className="text-blue-600 hover:underline">
                Create first sale
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  {["Invoice No", "Date", "Customer", "Amount", "Status"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-semibold text-slate-500 px-5 py-3"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-slate-50 hover:bg-slate-50"
                  >
                    <td className="px-5 py-3 text-sm font-mono font-semibold text-blue-700">
                      #{inv.invoiceNo}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-800">
                      {inv.customer?.name}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-slate-800">
                      ₹{fmt(inv.grandTotal)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge color={inv.status === "SAVED" ? "green" : "red"}>
                        {inv.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Recent Returns</h2>
          </div>

          {loading ? (
            <LoadingScreen />
          ) : recentReturns.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No returns yet.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  {["Return No", "Date", "Customer", "Credit"].map((h) => (
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
                {recentReturns.map((ret) => (
                  <tr
                    key={ret.id}
                    className="border-b border-slate-50 hover:bg-slate-50"
                  >
                    <td className="px-5 py-3 text-sm font-mono font-semibold text-red-600">
                      #SR-{ret.returnNo}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {new Date(ret.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-800">
                      {ret.customer?.name || "-"}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-red-600">
                      ₹{fmt(ret.totalCredit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
