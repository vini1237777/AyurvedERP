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
    group: "Masters",
    items: [
      { path: "/masters/customers", icon: "", label: "Customers" },
      { path: "/masters/items", icon: "", label: "Items" },
      { path: "/masters/batches", icon: "", label: "Batches" },
      // { path: "/masters/agents", icon: "", label: "Agents" },
      // { path: "/masters/hsn", icon: "", label: "HSN Codes" },
    ],
  },
  {
    group: "Reports",
    items: [
      { path: "/reports/sale-register", icon: "", label: "Sale Register" },
      { path: "/reports/gst", icon: "", label: "GST Report" },
      { path: "/reports/stock", icon: "", label: "Stock Report" },
    ],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`${collapsed ? "w-16" : "w-56"} flex-shrink-0 bg-white border-r border-slate-200 flex flex-col transition-all duration-200`}
      >
        {/* Logo */}
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

        {/* Nav */}
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
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium mb-0.5 transition-all
                      ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"}`}
                  >
                    <span className="text-base leading-none">{item.icon}</span>
                    {!collapsed && item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-1.5 text-slate-400 hover:text-slate-600 text-xs gap-1"
          >
            {collapsed ? "→" : "← Collapse"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
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
            <div className="text-sm font-medium text-slate-700">
              Fulanand Ayurved, Tasgaon
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
              F
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
