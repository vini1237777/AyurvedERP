import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { invoiceApi, salesReturnApi, authFetch } from "../utils/api";
import { fmt, fmtDate, fmtExpiry, fmtQty } from "../utils/invoice.utils";
import { Badge, LoadingScreen } from "../components/ui";
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
  expiring: {
    itemId: number;
    itemName: string;
    batchNo: string;
    expiryDate: string;
    currentQty: number;
  }[];
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

  const lines = [
    {
      label: "This month",
      note: summary?.monthReturns
        ? `after ₹${fmt(summary.monthReturns)} returns`
        : "",
      value: money(summary?.monthNet),
    },
    {
      // Payments aren't recorded anywhere yet, so this can't claim to be money owed.
      label: "Billed so far",
      note: summary ? plural(summary.invoiceCount, "invoice", "invoices") : "",
      value: money(summary?.outstanding),
    },
    {
      label: summary && summary.gstPayable < 0 ? "GST credit" : "GST payable",
      note: "tax on sales minus tax on purchases",
      value: money(summary ? Math.abs(summary.gstPayable) : undefined),
    },
  ];

  const toCheck = summary
    ? [
        {
          count: summary.expiredCount,
          text: `${summary.expiredCount === 1 ? "batch has" : "batches have"} expired with stock left`,
          to: "/masters/batches?stock=expired",
        },
        {
          count: summary.expiringCount,
          text: `${summary.expiringCount === 1 ? "batch expires" : "batches expire"} within 90 days`,
          to: "/masters/batches?stock=expiring",
        },
        {
          count: summary.lowStockCount,
          text: `${summary.lowStockCount === 1 ? "batch has" : "batches have"} fewer than 10 left`,
          to: "/masters/batches?stock=below10",
        },
      ]
    : [];

  const shortcuts = [
    { label: "Sale return", to: "/sales/return", show: canSell },
    { label: "Customers", to: "/masters/customers", show: role !== "RETAILER" },
    { label: "Items", to: "/masters/items", show: role !== "RETAILER" },
    { label: "Batches", to: "/masters/batches", show: canSeeBatches },
  ].filter((s) => s.show);

  const sectionTitle = "text-lg font-bold mb-1";
  const row = "border-b border-rule min-h-[34px] text-sm";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 xl:divide-x-2 xl:divide-rule">
      <section aria-label="Sales" className="min-w-0 xl:pr-7 pb-6 flex flex-col gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-[28px] leading-tight font-bold">
            Day book
          </h1>
          {canSell && (
            <Link
              to="/sales/new"
              className="min-h-[40px] inline-flex items-center px-5 bg-ink hover:bg-blue-700 text-white text-base font-semibold"
            >
              New sale
            </Link>
          )}
        </div>

        <dl>
          <div className="ledger-total flex flex-wrap items-baseline justify-between gap-x-4 py-1">
            <dt className="text-base font-semibold">
              Today's sales
              {summary && (
                <span className="block text-xs font-normal text-slate-600">
                  {summary.todayReturns
                    ? `After ₹${fmt(summary.todayReturns)} returns`
                    : "No returns today"}
                </span>
              )}
            </dt>
            <dd className="num text-[40px] leading-tight font-bold">
              {money(summary?.todayNet)}
            </dd>
          </div>
          {lines.map((l) => (
            <div
              key={l.label}
              className="flex flex-wrap items-baseline justify-between gap-x-4 min-h-[34px] py-1 border-b border-rule text-base"
            >
              <dt>
                {l.label}
                {l.note && (
                  <span className="ml-2 text-xs text-slate-600">{l.note}</span>
                )}
              </dt>
              <dd className="num font-semibold">{l.value}</dd>
            </div>
          ))}
        </dl>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className={sectionTitle}>Recent invoices</h2>
            <Link to="/sales" className="text-sm underline">
              View all
            </Link>
          </div>
          {loading ? (
            <LoadingScreen />
          ) : invoices.length === 0 ? (
            <p className="text-sm py-2 border-t-[1.5px] border-ink">
              No invoices yet.
            </p>
          ) : (
            <ul className="border-t-[1.5px] border-ink">
              {invoices.map((inv) => (
                <li
                  key={inv.id}
                  className={`${row} grid grid-cols-[64px_84px_minmax(0,1fr)_auto] gap-2 items-center`}
                >
                  <span className="font-semibold whitespace-nowrap">
                    {inv.invoiceNo}
                  </span>
                  <span className="whitespace-nowrap">
                    {fmtDate(inv.invoiceDate)}
                  </span>
                  <span className="truncate">
                    {inv.customer?.name}
                    {inv.status !== "SAVED" && (
                      <span className="ml-2">
                        <Badge color="red">Cancelled</Badge>
                      </span>
                    )}
                  </span>
                  <span className="num font-semibold">
                    ₹{fmt(inv.grandTotal)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className={sectionTitle}>Recent returns</h2>
          {loading ? (
            <LoadingScreen />
          ) : returns.length === 0 ? (
            <p className="text-sm py-2 border-t-[1.5px] border-ink">
              No returns yet.
            </p>
          ) : (
            <ul className="border-t-[1.5px] border-ink">
              {returns.slice(0, 3).map((ret) => (
                <li
                  key={ret.id}
                  className={`${row} grid grid-cols-[64px_84px_minmax(0,1fr)_auto] gap-2 items-center`}
                >
                  <span className="font-semibold whitespace-nowrap">
                    SR-{ret.returnNo}
                  </span>
                  <span className="whitespace-nowrap">
                    {fmtDate(ret.createdAt)}
                  </span>
                  <span className="truncate">{ret.customer?.name || "-"}</span>
                  <span className="num font-semibold">
                    ₹{fmt(ret.totalCredit)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section aria-label="To check" className="min-w-0 xl:pl-7 pb-6 flex flex-col gap-5">
        <h2 className="text-[28px] leading-tight font-bold">To check</h2>

        {summaryFailed ? (
          <p className="text-sm font-medium text-red-700">
            Stock alerts couldn't be loaded. Refresh the page to try again.
          </p>
        ) : loading ? (
          <LoadingScreen />
        ) : (
          <ul className="border-t-[1.5px] border-ink -mt-3">
            {toCheck.map((c) => {
              const inner = (
                <>
                  <span className="w-12 text-center">
                    {c.count > 0 ? (
                      <span className="pen-ring text-xl leading-8">
                        {fmtQty(c.count)}
                      </span>
                    ) : (
                      <span className="text-xl font-semibold text-slate-600">
                        0
                      </span>
                    )}
                  </span>
                  <span className={c.count > 0 ? "" : "text-slate-600"}>
                    {c.text}
                  </span>
                </>
              );
              const cls =
                "flex items-center gap-3 min-h-[48px] border-b border-rule text-base";
              return (
                <li key={c.to}>
                  {canSeeBatches && c.count > 0 ? (
                    <Link to={c.to} className={`${cls} hover:bg-slate-50`}>
                      {inner}
                    </Link>
                  ) : (
                    <div className={cls}>{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {!!summary?.expiring?.length && (
          <div>
            <h3 className={sectionTitle}>Sell these first</h3>
            <ul className="border-t-[1.5px] border-ink">
              {summary.expiring.slice(0, 5).map((b) => (
                <li
                  key={`${b.itemId}-${b.batchNo}`}
                  className={`${row} grid grid-cols-[minmax(0,1fr)_104px_76px_48px] gap-2 items-center`}
                >
                  <span className="truncate font-medium">{b.itemName}</span>
                  <span className="whitespace-nowrap">{b.batchNo}</span>
                  <span className="whitespace-nowrap">
                    {fmtExpiry(b.expiryDate)}
                  </span>
                  <span className="num font-semibold">
                    {fmtQty(b.currentQty)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!!summary?.topCustomers.length && (
          <div>
            <h3 className={sectionTitle}>Top customers</h3>
            <ol className="border-t-[1.5px] border-ink">
              {summary.topCustomers.slice(0, 3).map((c) => (
                <li
                  key={c.customerId}
                  className={`${row} flex items-center justify-between gap-3`}
                >
                  <span className="truncate">{c.name}</span>
                  <span className="num font-semibold">₹{fmt(c.total)}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {shortcuts.length > 0 && (
          <nav
            aria-label="Shortcuts"
            className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm"
          >
            {shortcuts.map((s) => (
              <Link key={s.to} to={s.to} className="underline">
                {s.label}
              </Link>
            ))}
          </nav>
        )}

        <p className="text-xs text-slate-600">
          Demo data. These are made up business records, not a real client's.
        </p>
      </section>
    </div>
  );
}
