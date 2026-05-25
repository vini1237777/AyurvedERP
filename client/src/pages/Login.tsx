import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function LoginHalo() {
  return (
    <>
      <style>{`
        @keyframes loginHaloSpin { to { transform: rotate(360deg); } }
        @keyframes loginHaloShift {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
          50% { transform: translate(-50%, -50%) scale(1.04); opacity: 0.7; }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-0"
        style={{
          width: "min(120%, 1100px)",
          aspectRatio: "1 / 0.7",
          transform: "translate(-50%, -50%)",
          filter: "blur(90px)",
          animation: "loginHaloShift 10s ease-in-out infinite",
        }}
      >
        <div
          className="absolute inset-0 rounded-[50%]"
          style={{
            background:
              "conic-gradient(from 0deg, #ff8a8a, #ffd28a, #fff48a, #a8f0c2, #8acdff, #b69cff, #ff9cce, #ff8a8a)",
            opacity: 0.35,
            animation: "loginHaloSpin 24s linear infinite",
          }}
        />
        <div
          className="absolute inset-[12%] rounded-[50%]"
          style={{
            background:
              "radial-gradient(closest-side, rgba(255,255,255,0.9), rgba(255,255,255,0.45) 55%, transparent 85%)",
          }}
        />
      </div>
    </>
  );
}

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setY(window.scrollY));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return y;
}

function Sprig({
  className,
  factor = 0.06,
  offset = 0,
  scale = 1,
  variant = 1,
}: {
  className?: string;
  factor?: number;
  offset?: number;
  scale?: number;
  variant?: 1 | 2 | 3;
}) {
  const y = useScrollY();
  const rotate = (y + offset) * factor + offset * 0.02;
  const lift = Math.sin((y + offset) * 0.002) * 6;
  return (
    <div
      className={`pointer-events-none absolute ${className || ""}`}
      style={{
        transform: `translateY(${lift}px) rotate(${rotate}deg) scale(${scale})`,
        transformOrigin: "50% 80%",
        transition: "transform 80ms linear",
      }}
      aria-hidden="true"
    >
      <svg width="180" height="220" viewBox="0 0 180 220" fill="none">
        {variant === 1 && (
          <g stroke="#047857" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M90 210 Q90 130 60 80 Q88 78 92 130" fill="#a7f3d0" fillOpacity="0.5" />
            <path d="M90 210 Q90 130 120 80 Q92 78 88 130" fill="#a7f3d0" fillOpacity="0.5" />
            <path d="M90 170 Q90 140 70 120 Q88 118 92 140" fill="#bbf7d0" fillOpacity="0.45" />
            <path d="M90 170 Q90 140 110 120 Q92 118 88 140" fill="#bbf7d0" fillOpacity="0.45" />
            <path d="M90 220 L90 60" />
            <circle cx="90" cy="55" r="3" fill="#047857" />
          </g>
        )}
        {variant === 2 && (
          <g stroke="#065f46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M90 210 Q70 160 50 120 Q72 110 90 150" fill="#86efac" fillOpacity="0.45" />
            <path d="M90 210 Q110 160 130 120 Q108 110 90 150" fill="#86efac" fillOpacity="0.45" />
            <path d="M70 180 Q50 160 30 140 Q52 130 70 150" fill="#bbf7d0" fillOpacity="0.4" />
            <path d="M110 180 Q130 160 150 140 Q128 130 110 150" fill="#bbf7d0" fillOpacity="0.4" />
            <path d="M90 220 L90 90" />
          </g>
        )}
        {variant === 3 && (
          <g stroke="#15803d" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M90 210 Q60 150 40 80" />
            <path d="M90 210 Q120 150 140 80" />
            <path d="M90 210 Q90 140 90 60" />
            <ellipse cx="55" cy="100" rx="20" ry="10" fill="#86efac" fillOpacity="0.5" />
            <ellipse cx="125" cy="100" rx="20" ry="10" fill="#86efac" fillOpacity="0.5" />
            <ellipse cx="90" cy="80" rx="22" ry="12" fill="#bbf7d0" fillOpacity="0.55" />
          </g>
        )}
      </svg>
    </div>
  );
}

type Section = {
  title: string;
  items: { title: string; body: string }[];
};

const FEATURE_SECTIONS: Section[] = [
  {
    title: "Technology Stack",
    items: [
      {
        title: "Frontend",
        body: "React, TypeScript, Tailwind, Vite. A fast SPA with strict types end to end.",
      },
      {
        title: "Backend",
        body: "Node.js, Express, Prisma, PostgreSQL. A thin REST layer over a 20-table relational schema.",
      },
    ],
  },
  {
    title: "Security & Auth",
    items: [
      {
        title: "JWT Authentication",
        body: "Token-based auth with role-aware claims. Different permissions per user role.",
      },
      {
        title: "Data Protection",
        body: "bcrypt password hashing, configurable CORS, and request validation on every write endpoint.",
      },
    ],
  },
  {
    title: "Accounting Engine",
    items: [
      {
        title: "Double-Entry Posting",
        body: "Every sale and purchase posts balanced debit/credit legs, verifiable from the Trial Balance.",
      },
      {
        title: "Atomic Transactions",
        body: "Prisma $transaction blocks keep items, batch stock, and journal entries consistent under every write.",
      },
    ],
  },
  {
    title: "GST & Inventory",
    items: [
      {
        title: "Auto GST Routing",
        body: "Auto-selects CGST/SGST vs IGST from supplier and customer state codes. No manual tax-type picks.",
      },
      {
        title: "Batch Inventory",
        body: "Pharma-grade batch master with MRP, expiry, and current qty, maintained on every sale, purchase, and return.",
      },
    ],
  },
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: { pathname?: string } } };
  const from = loc.state?.from?.pathname || "/dashboard";

  const DEMO_ROLES: {
    role: "ADMIN" | "SELLER" | "ACCOUNTANT" | "RETAILER";
    email: string;
    password: string;
    label: string;
    hint: string;
  }[] = [
    {
      role: "ADMIN",
      email: "admin@aushadhi.local",
      password: "admin123",
      label: "Admin",
      hint: "Full access",
    },
    {
      role: "SELLER",
      email: "seller@aushadhi.local",
      password: "seller123",
      label: "Seller",
      hint: "Sales and customers",
    },
    {
      role: "ACCOUNTANT",
      email: "accountant@aushadhi.local",
      password: "accountant123",
      label: "Accountant",
      hint: "Reports and ledger",
    },
    {
      role: "RETAILER",
      email: "retailer@aushadhi.local",
      password: "retailer123",
      label: "Retailer",
      hint: "Read only catalog",
    },
  ];

  const [activeRole, setActiveRole] = useState<typeof DEMO_ROLES[number]["role"]>(
    "ADMIN",
  );
  const [email, setEmail] = useState(DEMO_ROLES[0].email);
  const [password, setPassword] = useState(DEMO_ROLES[0].password);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      nav(from, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-emerald-50/40 to-white relative overflow-hidden">
      <LoginHalo />
      {/* Rotating botanical sprigs */}
      <Sprig className="top-16 -left-8 sm:left-2 opacity-50" factor={0.05} scale={1.1} variant={1} />
      <Sprig className="bottom-32 right-1/4 opacity-30 hidden lg:block" factor={-0.05} offset={600} scale={0.6} variant={1} />

      {/* Header — matches Landing exactly */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-slate-900 flex items-center justify-center text-white text-xs font-bold">
              A
            </div>
            <span className="font-semibold text-slate-900 tracking-tight text-sm">
              Aushadhi
            </span>
          </div>
          <div className="flex items-center gap-5 text-xs text-slate-600">
            <Link to="/welcome" className="hover:text-slate-900">
              Home
            </Link>
            <button
              type="button"
              onClick={() => setShowFeatures(true)}
              className="hover:text-slate-900"
            >
              Features
            </button>
          </div>
        </div>
      </header>

      {/* Centered content */}
      <div className="relative flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[440px]">
          {/* Hero block */}
          <div className="text-center mb-10">
            <h1 className="text-[64px] sm:text-[88px] font-semibold text-slate-900 tracking-[-0.045em] leading-[0.92] mb-4">
              Sign in.
            </h1>
            <p className="text-slate-500 text-lg sm:text-xl font-light tracking-tight">
              Pick a role and continue.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-3">
            {/* Demo account picker */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">
                Use demo account
              </label>
              <div className="relative">
                <select
                  value={activeRole}
                  onChange={(e) => {
                    const r = DEMO_ROLES.find(
                      (x) => x.role === e.target.value,
                    );
                    if (r) {
                      setActiveRole(r.role);
                      setEmail(r.email);
                      setPassword(r.password);
                      setError(null);
                    }
                  }}
                  className="w-full appearance-none cursor-pointer pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-[15px] text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition"
                >
                  {DEMO_ROLES.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.label} · {r.hint}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  Password
                </label>
                <button
                  type="button"
                  onClick={(e) => e.preventDefault()}
                  className="text-[11px] text-slate-500 hover:text-slate-900"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pr-14 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-500 hover:text-slate-900"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 mt-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 text-white text-[15px] font-semibold rounded-full shadow-md shadow-emerald-700/20 transition-colors"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center mt-6 text-xs text-slate-500">
            Don't have an account?{" "}
            <span className="font-semibold text-slate-900">Contact admin</span>
          </p>
        </div>
      </div>

      {showFeatures && (
        <FeaturesOverlay onClose={() => setShowFeatures(false)} />
      )}
    </div>
  );
}

function FeaturesOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#ebe6dc] overflow-hidden">
      {/* Header row */}
      <div className="border-b border-stone-300/70 shrink-0">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <span className="text-xs tracking-[0.3em] font-semibold text-stone-800 border-b border-stone-800 pb-0.5">
            FEATURES
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-stone-500 hover:text-stone-900 text-2xl leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* Sections grid — fills remaining height, no scroll */}
      <div className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-8 py-10 flex items-center">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-x-24 gap-y-16">
          {FEATURE_SECTIONS.map((section) => (
            <section key={section.title} className="text-center">
              <h3 className="font-serif text-xl text-stone-900 mb-8 inline-block border-b border-stone-800 pb-1">
                {section.title}
              </h3>
              <div className="space-y-7">
                {section.items.map((item) => (
                  <div key={item.title}>
                    <h4 className="font-serif font-semibold text-base text-stone-900 mb-2">
                      {item.title}
                    </h4>
                    <p className="font-serif text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-stone-300/70 shrink-0">
        <div className="max-w-7xl mx-auto px-8 py-3 flex justify-end gap-10 text-sm font-serif text-stone-700">
          <a
            href="https://github.com/vini1237777/AyurvedERP"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-stone-900"
          >
            Source on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
