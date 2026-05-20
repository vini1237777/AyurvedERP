import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const NAV = [
  { group: "Main", items: [{ path: "/", icon: "", label: "Dashboard" }] },
  {
    group: "Sales",
    items: [
      { path: "/sales/new", icon: "", label: "New Sale" },
      { path: "/sales", icon: "", label: "All Invoices" },
      { path: "/sales/return", icon: "", label: "Sale Return" },
    ],
  },
  {
    group: "Purchases",
    items: [
      { path: "/purchases/new", icon: "", label: "New Purchase" },
      { path: "/purchases", icon: "", label: "All Purchases" },
    ],
  },
  {
    group: "Masters",
    items: [
      { path: "/masters/customers", icon: "", label: "Customers" },
      { path: "/masters/items", icon: "", label: "Items" },
      { path: "/masters/batches", icon: "", label: "Batches" },
    ],
  },
  {
    group: "Reports",
    items: [
      { path: "/reports/sale-register", icon: "", label: "Sale Register" },
      { path: "/reports/gst", icon: "", label: "GST Report" },
      { path: "/reports/gst-r1", icon: "", label: "GST R1" },
      { path: "/reports/gst-r3", icon: "", label: "GST R3B" },
      { path: "/reports/stock", icon: "", label: "Stock Report" },
      { path: "/reports/ledger", icon: "", label: "Party Ledger" },
      { path: "/reports/item-category", icon: "", label: "Item Category" },
      {
        path: "/reports/customer-category",
        icon: "",
        label: "Customer Category",
      },
    ],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50">
      <aside
        className={`${collapsed ? "w-16" : "w-56"} flex-shrink-0 bg-white border-r border-slate-200 flex flex-col transition-all duration-200`}
      >
        <div className="h-14 flex items-center px-4 border-b border-slate-100">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                F
              </div>
              <span className="font-bold text-slate-800 text-sm leading-tight">
                Fulanand
                <br />
                <span className="text-blue-600 font-semibold">ERP</span>
              </span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm mx-auto">
              F
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV.map((group) => (
            <div key={group.group} className="mb-4">
              {!collapsed && (
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1">
                  {group.group}
                </div>
              )}
              {group.items.map((item) => {
                const active =
                  location.pathname === item.path ||
                  (item.path !== "/" &&
                    location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium mb-0.5 transition-all ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"}`}
                  >
                    <span className="text-base leading-none w-4 text-center flex-shrink-0">
                      {item.icon}
                    </span>
                    {!collapsed && item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-1.5 text-slate-400 hover:text-slate-600 text-xs gap-1"
          >
            {collapsed ? "→" : "← Collapse"}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="text-sm text-slate-500">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/vini1237777/AyurvedERP"
              target="_blank"
              rel="noopener noreferrer"
              title="View source on GitHub"
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-2.5 py-1 rounded-md hover:bg-slate-100"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.335-5.467-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.807 5.625-5.48 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              GitHub
            </a>
            <div className="text-sm font-medium text-slate-700">
              Fulanand Ayurved, Tasgaon
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
              F
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
