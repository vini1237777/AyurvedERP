import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { companyApi } from "../../utils/api";
import type { Company } from "../../types";
import { useAuth } from "../../auth/AuthContext";
import { Toast } from "../ui";

type Role = "ADMIN" | "SELLER" | "ACCOUNTANT" | "RETAILER";
type NavLeaf = { path: string; label: string; roles?: Role[] };
type NavItem =
  | NavLeaf
  | { key: string; label: string; roles?: Role[]; children: NavLeaf[] };

// roles undefined = visible to everyone authenticated
const ALL: Role[] = ["ADMIN", "SELLER", "ACCOUNTANT", "RETAILER"];
const NAV: { group: string; roles?: Role[]; items: NavItem[] }[] = [
  { group: "Main", items: [{ path: "/dashboard", label: "Dashboard" }] },
  {
    group: "Sales",
    roles: ["ADMIN", "SELLER", "ACCOUNTANT", "RETAILER"],
    items: [
      { path: "/sales/new", label: "New Sale", roles: ["ADMIN", "SELLER"] },
      { path: "/sales", label: "All Invoices" },
      { path: "/sales/return", label: "Sale Return", roles: ["ADMIN", "SELLER"] },
    ],
  },
  {
    group: "Purchases",
    roles: ["ADMIN", "ACCOUNTANT"],
    items: [
      { path: "/purchases/new", label: "New Purchase", roles: ["ADMIN"] },
      { path: "/purchases", label: "All Purchases" },
    ],
  },
  {
    group: "Masters",
    roles: ["ADMIN", "SELLER", "ACCOUNTANT"],
    items: [
      { path: "/masters/customers", label: "Customers" },
      { path: "/masters/items", label: "Items" },
      { path: "/masters/batches", label: "Batches", roles: ["ADMIN", "ACCOUNTANT"] },
    ],
  },
  {
    group: "Reports",
    items: [
      { path: "/reports/sale-register", label: "Sale Register" },
      {
        key: "gst",
        label: "GST",
        children: [
          { path: "/reports/gst", label: "GST Summary" },
          { path: "/reports/gst-r1", label: "GST R1" },
          { path: "/reports/gst-r3", label: "GST R3B" },
          { path: "/reports/hsn-summary", label: "HSN Summary" },
        ],
      },
      { path: "/reports/stock", label: "Stock Report" },
      { path: "/reports/ledger", label: "Party Ledger", roles: ["ADMIN", "ACCOUNTANT"] },
      { path: "/reports/trial-balance", label: "Trial Balance", roles: ["ADMIN", "ACCOUNTANT"] },
      { path: "/reports/item-category", label: "Item Category" },
      { path: "/reports/customer-category", label: "Customer Category" },
    ],
  },
  {
    group: "Settings",
    roles: ["ADMIN"],
    items: [{ path: "/settings/profile", label: "Company Profile" }],
  },
];

// Line icons, one per screen, so the collapsed sidebar stays readable.
const ICON_PATHS: Record<string, string[]> = {
  "/dashboard": ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M14 14h7v7h-7z", "M3 14h7v7H3z"],
  "/sales/new": ["M12 5v14", "M5 12h14"],
  "/sales": ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M8 13h8", "M8 17h8"],
  "/sales/return": ["M9 14 4 9l5-5", "M4 9h11a5 5 0 0 1 0 10h-3"],
  "/purchases/new": ["M21 8l-9-5-9 5 9 5 9-5z", "M3 8v8l9 5 9-5V8", "M12 13v8"],
  "/purchases": ["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01", "M3 12h.01", "M3 18h.01"],
  "/masters/customers": ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
  "/masters/items": ["M20 7H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1z", "M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"],
  "/masters/batches": ["M12 2 2 7l10 5 10-5-10-5z", "M2 17l10 5 10-5", "M2 12l10 5 10-5"],
  "/reports/sale-register": ["M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z", "M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"],
  gst: ["M19 5 5 19", "M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", "M17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"],
  "/reports/stock": ["M4 20V10", "M12 20V4", "M20 20v-6"],
  "/reports/ledger": ["M2 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H2z", "M22 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z"],
  "/reports/trial-balance": ["M12 3v18", "M5 7h14", "M5 7l-3 7a3 3 0 0 0 6 0z", "M19 7l-3 7a3 3 0 0 0 6 0z"],
  "/reports/item-category": ["M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z", "M7.5 7.5h.01"],
  "/reports/customer-category": ["M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"],
  "/settings/profile": ["M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18", "M2 22h20", "M10 6h4", "M10 10h4", "M10 14h4"],
};

function NavIcon({ name }: { name: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-shrink-0"
      aria-hidden="true"
    >
      {(ICON_PATHS[name] || ICON_PATHS.gst).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

function allowed(role: Role | undefined, roles?: Role[]): boolean {
  if (!roles) return true;
  if (!role) return false;
  return roles.includes(role);
}

// Annotate every item with a `locked` flag + the required roles, so the UI can
// show them dimmed instead of hiding them entirely.
type LeafView = NavLeaf & { locked: boolean; required?: Role[] };
type GroupView = {
  group: string;
  locked: boolean;
  required?: Role[];
  items: (LeafView | { key: string; label: string; locked: boolean; required?: Role[]; children: LeafView[] })[];
};

function annotateNav(role: Role | undefined): GroupView[] {
  return NAV.map((g) => ({
    group: g.group,
    locked: !allowed(role, g.roles),
    required: g.roles,
    items: g.items.map((it) => {
      if (isLeaf(it)) {
        return { ...it, locked: !allowed(role, it.roles), required: it.roles };
      }
      const kids: LeafView[] = it.children.map((c) => ({
        ...c,
        locked: !allowed(role, c.roles),
        required: c.roles,
      }));
      return {
        key: it.key,
        label: it.label,
        locked: !allowed(role, it.roles),
        required: it.roles,
        children: kids,
      };
    }),
  }));
}
void ALL;

const isLeaf = (i: NavItem): i is NavLeaf => "path" in i;

function isActive(pathname: string, target: string) {
  if (target === "/") return pathname === "/";
  return pathname === target || pathname.startsWith(target + "/");
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [company, setCompany] = useState<Company | null>(null);
  const [forbiddenMsg, setForbiddenMsg] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // On small screens the sidebar slides in, and always shows its labels.
  const collapsedNow = collapsed && !drawerOpen;

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = () => setMenuOpen(false);
    window.addEventListener("click", onDocClick);
    return () => window.removeEventListener("click", onDocClick);
  }, [menuOpen]);

  useEffect(() => {
    companyApi.get().then(setCompany).catch(() => {});
  }, []);

  useEffect(() => {
    const onForbidden = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      setForbiddenMsg(detail || "You don't have permission for that action.");
    };
    window.addEventListener("api:forbidden", onForbidden);
    return () => window.removeEventListener("api:forbidden", onForbidden);
  }, []);

  const businessName = company?.name || "Company Profile";
  const businessInitial = (company?.name || "C").charAt(0).toUpperCase();
  const userRole = (user as any)?.role as Role | undefined;
  const visibleNav = annotateNav(userRole);
  const lockedLinkTo = (required?: Role[]) =>
    `/no-access${required ? `?need=${required.join(",")}` : ""}`;

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      visibleNav.forEach((g) =>
        g.items.forEach((item) => {
          if ("children" in item) {
            const childActive = item.children.some((c) =>
              isActive(location.pathname, c.path),
            );
            if (childActive) next[item.key] = true;
          }
        }),
      );
      return next;
    });
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-slate-50">
      {drawerOpen && (
        <div
          aria-hidden="true"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}
      <aside
        id="app-sidebar"
        className={`${collapsedNow ? "w-16" : "w-56"} fixed md:static inset-y-0 left-0 z-40 ${drawerOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"} md:translate-x-0 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col transition-all duration-200`}
      >
        <div className="h-14 flex items-center px-4 border-b border-slate-100">
          {!collapsedNow ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                A
              </div>
              <span className="font-bold text-slate-800 text-sm leading-tight">
                Aushadhi
                <br />
                <span className="text-blue-600 font-semibold">ERP</span>
              </span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm mx-auto">
              A
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {visibleNav.map((group) => (
            <div key={group.group} className="mb-4">
              {!collapsedNow && (
                <div className="text-xs font-semibold text-slate-400 px-2 mb-1">
                  {group.group}
                </div>
              )}
              {group.items.map((item) => {
                const groupLocked = group.locked;
                if ("path" in item) {
                  const itemLocked = groupLocked || item.locked;
                  const active = isActive(location.pathname, item.path);
                  const to = itemLocked
                    ? lockedLinkTo(item.required || group.required)
                    : item.path;
                  return (
                    <Link
                      key={item.path}
                      to={to}
                      aria-label={collapsedNow ? item.label : undefined}
                      title={
                        itemLocked
                          ? `Requires ${(item.required || group.required)?.join(" or ") || "another"} role`
                          : collapsedNow
                            ? item.label
                            : undefined
                      }
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium mb-0.5 transition-all ${
                        itemLocked
                          ? "text-slate-300 hover:bg-slate-50 cursor-not-allowed"
                          : active
                            ? "bg-blue-50 text-blue-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                      }`}
                    >
                      <NavIcon name={item.path} />
                      {!collapsedNow && item.label}
                    </Link>
                  );
                }
                const open = !!openGroups[item.key];
                const childActive = item.children.some((c) =>
                  isActive(location.pathname, c.path),
                );
                if (collapsedNow) {
                  return item.children.map((c) => {
                    const cLocked = groupLocked || item.locked || c.locked;
                    const active = isActive(location.pathname, c.path);
                    const to = cLocked
                      ? lockedLinkTo(c.required || item.required || group.required)
                      : c.path;
                    return (
                      <Link
                        key={c.path}
                        to={to}
                        aria-label={c.label}
                        title={
                          cLocked
                            ? `Requires ${(c.required || item.required || group.required)?.join(" or ") || "another"} role`
                            : c.label
                        }
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium mb-0.5 transition-all ${
                          cLocked
                            ? "text-slate-300 cursor-not-allowed"
                            : active
                              ? "bg-blue-50 text-blue-700"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                        }`}
                      >
                        <NavIcon name="gst" />
                      </Link>
                    );
                  });
                }
                return (
                  <div key={item.key}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenGroups((p) => ({ ...p, [item.key]: !open }))
                      }
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium mb-0.5 transition-all ${
                        groupLocked || item.locked
                          ? "text-slate-400"
                          : childActive
                            ? "bg-blue-50 text-blue-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                      }`}
                    >
                      <NavIcon name="gst" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <span className="text-xs text-slate-400">
                        {open ? "▾" : "▸"}
                      </span>
                    </button>
                    {open && (
                      <div className="ml-3 pl-2 border-l border-slate-200 mb-1">
                        {item.children.map((c) => {
                          const cLocked = groupLocked || item.locked || c.locked;
                          const active = isActive(location.pathname, c.path);
                          const to = cLocked
                            ? lockedLinkTo(c.required || item.required || group.required)
                            : c.path;
                          return (
                            <Link
                              key={c.path}
                              to={to}
                              title={
                                cLocked
                                  ? `Requires ${(c.required || item.required || group.required)?.join(" or ") || "another"} role`
                                  : undefined
                              }
                              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm mb-0.5 transition-all ${
                                cLocked
                                  ? "text-slate-300 cursor-not-allowed"
                                  : active
                                    ? "bg-blue-50 text-blue-700 font-medium"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                              }`}
                            >
                              {c.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="hidden md:block p-3 border-t border-slate-100">
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsedNow ? "Expand sidebar" : "Collapse sidebar"}
            className="w-full flex items-center justify-center py-1.5 text-slate-500 hover:text-slate-700 text-xs gap-1"
          >
            {collapsedNow ? "→" : "← Collapse"}
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between gap-3 px-4 md:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            aria-controls="app-sidebar"
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <NavIcon name="/purchases" />
          </button>
          <div className="hidden sm:block text-sm text-slate-500 truncate">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <a
              href="https://github.com/vini1237777/AyurvedERP"
              target="_blank"
              rel="noopener noreferrer"
              title="View source on GitHub"
              className="text-slate-500 hover:text-slate-900 transition-colors p-2 rounded-full hover:bg-slate-100"
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
            </a>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100 transition-colors"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                  {(user?.name || businessInitial).charAt(0).toUpperCase()}
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-slate-400"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-[260px] bg-white border border-slate-200/80 rounded-lg shadow-[0_12px_32px_-8px_rgba(15,23,42,0.12)] z-50 py-1"
                >
                  {/* Identity row — avatar + name/email */}
                  <div className="px-2.5 py-2 flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-[13px] font-semibold flex-shrink-0">
                      {(user?.name || businessInitial).charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-slate-900 truncate leading-tight">
                        {user?.name || "Account"}
                      </div>
                      <div className="text-[12px] text-slate-500 truncate leading-tight mt-0.5">
                        {user?.email}
                      </div>
                    </div>
                  </div>

                  {/* Workspace meta — single subtle line */}
                  <div className="px-2.5 pb-2 pt-1 flex items-center justify-between gap-2">
                    <span
                      className="text-[12px] text-slate-500 truncate"
                      title={businessName}
                    >
                      {businessName
                        .toLowerCase()
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                    {(user as any)?.role && (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {(user as any).role}
                      </span>
                    )}
                  </div>

                  <div className="h-px bg-slate-100 mx-1 my-1" />

                  {/* Actions */}
                  <Link
                    to="/settings/profile"
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                    className="flex items-center gap-2.5 px-2.5 py-1.5 mx-1 rounded-md text-[13px] text-slate-700 hover:bg-slate-100"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-slate-400 flex-shrink-0"
                      aria-hidden="true"
                    >
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    Company profile
                  </Link>

                  <div className="h-px bg-slate-100 mx-1 my-1" />

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-2.5 w-[calc(100%-0.5rem)] mx-1 px-2.5 py-1.5 rounded-md text-[13px] text-slate-700 hover:bg-slate-100"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-slate-400 flex-shrink-0"
                      aria-hidden="true"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
      {forbiddenMsg && (
        <Toast
          message={forbiddenMsg}
          type="error"
          onClose={() => setForbiddenMsg(null)}
        />
      )}
    </div>
  );
}
