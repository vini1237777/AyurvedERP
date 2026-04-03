import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { invoiceApi, salesReturnApi } from "../utils/api";
import { fmt } from "../utils/invoice.utils";
import { Card, Badge, LoadingScreen } from "../components/ui";
import type { Invoice } from "../types";

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

export default function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const invoiceData = await invoiceApi.getAll();
        setInvoices(invoiceData || []);
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

  const recentInvoices = invoices.slice(0, 5);
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
        <p className="text-slate-500 text-sm mt-0.5">Welcome to Fulanand ERP</p>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div>
              <p className="text-sm text-slate-500 mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

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
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Recent Returns</h2>
            <Link
              to="/sales/returns"
              className="text-sm text-blue-600 hover:underline"
            >
              View all
            </Link>
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
