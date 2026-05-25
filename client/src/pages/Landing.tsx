import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

// Returns 0..1 progress as the element scrolls through the viewport.
// 0 = top edge of element just entered the bottom of viewport
// 1 = bottom edge of element just left the top of viewport
function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height - vh;
      if (total <= 0) {
        setProgress(rect.top < vh / 2 ? 1 : 0);
        return;
      }
      const scrolled = -rect.top;
      const p = Math.max(0, Math.min(1, scrolled / total));
      setProgress(p);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return { ref, progress };
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
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return y;
}

// Decorative botanical sprig - rotates and drifts with scroll.
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
  const rotate = (y + offset) * factor;
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
          <g
            stroke="#047857"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M90 210 Q90 130 60 80 Q88 78 92 130" fill="#a7f3d0" fillOpacity="0.5" />
            <path d="M90 210 Q90 130 120 80 Q92 78 88 130" fill="#a7f3d0" fillOpacity="0.5" />
            <path d="M90 170 Q90 140 70 120 Q88 118 92 140" fill="#bbf7d0" fillOpacity="0.45" />
            <path d="M90 170 Q90 140 110 120 Q92 118 88 140" fill="#bbf7d0" fillOpacity="0.45" />
            <path d="M90 220 L90 60" />
            <circle cx="90" cy="55" r="3" fill="#047857" />
          </g>
        )}
        {variant === 2 && (
          <g
            stroke="#065f46"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M90 210 Q70 160 50 120 Q72 110 90 150" fill="#86efac" fillOpacity="0.45" />
            <path d="M90 210 Q110 160 130 120 Q108 110 90 150" fill="#86efac" fillOpacity="0.45" />
            <path d="M70 180 Q50 160 30 140 Q52 130 70 150" fill="#bbf7d0" fillOpacity="0.4" />
            <path d="M110 180 Q130 160 150 140 Q128 130 110 150" fill="#bbf7d0" fillOpacity="0.4" />
            <path d="M90 220 L90 90" />
          </g>
        )}
        {variant === 3 && (
          <g
            stroke="#15803d"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
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

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            obs.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({
  children,
  delay = 0,
  className = "",
  noFadeOut = false,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  noFadeOut?: boolean;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (noFadeOut) return;
    const outer = ref.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    let raf = 0;
    let ticking = false;

    const update = () => {
      const rect = outer.getBoundingClientRect();
      const vh = window.innerHeight;
      const center = rect.top + rect.height / 2;
      const trigger = vh * 0.25;
      let o = 1;
      if (center < trigger) {
        o = Math.max(0, Math.min(1, center / trigger));
      }
      inner.style.opacity = String(o);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        raf = requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [noFadeOut, ref]);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
      className={`transition-all duration-1000 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      } ${className}`}
    >
      <div ref={innerRef} style={{ transition: "opacity 220ms linear" }}>
        {children}
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header />
      <Hero />
      <PinnedShowcase />
      <Modules />
      <Performance />
      <Architecture />
      <BillSection />
      <Specs />
      <CTA />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl/70">
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
          <a
            href="https://github.com/vini1237777/AyurvedERP"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-900"
          >
            GitHub
          </a>
          <Link
            to="/login"
            className="font-semibold text-slate-900 hover:text-slate-700"
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-emerald-50/40 to-white">
      <Sprig className="top-10 -left-6 sm:left-2 opacity-90" factor={0.06} scale={1.1} variant={1} />
      <Sprig className="top-28 -right-6 sm:right-4 opacity-80" factor={-0.08} offset={200} scale={0.9} variant={2} />
      <Sprig className="bottom-20 left-1/4 opacity-50 hidden lg:block" factor={0.04} offset={400} scale={0.7} variant={3} />
      <Sprig className="bottom-32 right-1/4 opacity-50 hidden lg:block" factor={-0.05} offset={600} scale={0.6} variant={1} />

      <div className="relative max-w-6xl mx-auto px-6 pt-28 pb-16 text-center">
        <Reveal delay={80}>
          <h1 className="text-[64px] sm:text-[112px] font-semibold text-slate-900 tracking-[-0.045em] leading-[0.92] mb-6">
            The ERP for
            <br />
            Ayurveda trade.
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="text-slate-500 text-lg sm:text-xl font-light tracking-tight max-w-2xl mx-auto mb-10 leading-[1.5]">
            Billing, batches, GST and a real double entry ledger.
            <br className="hidden sm:block" /> Built for how Indian pharma
            distribution actually works.
          </p>
        </Reveal>
        <Reveal delay={240}>
          <div className="flex items-center justify-center gap-5 text-sm">
            <Link
              to="/login"
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-5 py-2.5 rounded-full shadow-md shadow-emerald-700/20 transition-colors"
            >
              Try the demo
            </Link>
            <a
              href="https://github.com/vini1237777/AyurvedERP"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-700 hover:text-slate-900 font-medium"
            >
              View source &rsaquo;
            </a>
          </div>
        </Reveal>
        <Reveal delay={320}>
          <p className="mt-8 text-[11px] tracking-[0.2em] uppercase text-slate-400">
            React · Vite · Express · Prisma · PostgreSQL
          </p>
        </Reveal>
      </div>
      <Reveal delay={320}>
        <div className="max-w-6xl mx-auto px-6 pb-16">
          <div
            className="relative mx-auto"
            style={{ perspective: "2200px" }}
          >
            <IridescentHalo spread={1.5} />

            <div className="relative flex items-end justify-center gap-4 sm:gap-6">
              {/* Laptop — left, slight 3D tilt */}
              <div
                className="relative flex-1 max-w-[860px]"
                style={{
                  transform: "rotateX(3deg) rotateY(-4deg)",
                  transformStyle: "preserve-3d",
                  transformOrigin: "right center",
                }}
              >
                <LaptopFrame>
                  <ScreenDashboard show />
                </LaptopFrame>
              </div>

              {/* Phone — right, floats up, opposite tilt */}
              <div
                className="relative hidden sm:block w-[180px] lg:w-[220px] -mb-6 lg:-mb-12"
                style={{
                  transform: "rotateX(3deg) rotateY(8deg) translateY(-10%)",
                  transformStyle: "preserve-3d",
                  transformOrigin: "left center",
                }}
              >
                <PhoneFrame>
                  <ScreenPhone />
                </PhoneFrame>
              </div>
            </div>

            {/* Shared ground shadow */}
            <div className="mx-auto mt-2 h-8 w-[78%] bg-slate-900/10 blur-2xl rounded-full" />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Typewriter({
  text,
  split,
  speed = 32,
  className = "",
  splitClassName = "",
  caret = true,
  once = false,
}: {
  text: string;
  split?: number;
  speed?: number;
  className?: string;
  splitClassName?: string;
  caret?: boolean;
  once?: boolean;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            if (once) {
              setVisible(true);
              obs.unobserve(e.target);
            } else {
              setShown(0);
              setVisible(true);
            }
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -80px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [once]);

  useEffect(() => {
    if (!visible) return;
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setShown(i);
      if (i >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [visible, text, speed]);

  const done = shown >= text.length;
  const caretEl = caret && (
    <span
      aria-hidden="true"
      className={`inline-block w-[3px] h-[0.8em] ml-[2px] align-[-0.05em] bg-emerald-600 ${done ? "animate-pulse" : ""}`}
    />
  );

  if (split !== undefined) {
    const a = text.slice(0, Math.min(shown, split));
    const b = shown > split ? text.slice(split, shown) : "";
    return (
      <span ref={ref} className={className}>
        {a}
        {b && <span className={splitClassName}>{b}</span>}
        {caretEl}
      </span>
    );
  }

  return (
    <span ref={ref} className={className}>
      {text.slice(0, shown)}
      {caretEl}
    </span>
  );
}

function TiltCard({
  children,
  intensity = 6,
  className = "",
}: {
  children: React.ReactNode;
  intensity?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, glow: { x: 50, y: 50 } });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width;
    const cy = (e.clientY - rect.top) / rect.height;
    setTilt({
      x: (0.5 - cy) * intensity,
      y: (cx - 0.5) * intensity,
      glow: { x: cx * 100, y: cy * 100 },
    });
  };

  const onLeave = () => setTilt({ x: 0, y: 0, glow: { x: 50, y: 50 } });

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`relative h-full ${className}`}
      style={{
        perspective: "1200px",
      }}
    >
      <div
        className="relative h-full transition-transform duration-300 ease-out will-change-transform"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
          style={{
            background: `radial-gradient(circle 200px at ${tilt.glow.x}% ${tilt.glow.y}%, rgba(16,185,129,0.10), transparent 70%)`,
          }}
        />
        {children}
      </div>
    </div>
  );
}

function Modules() {
  const SECONDARY = [
    {
      name: "Inventory",
      sub: "Batch-wise stock, expiry alerts, low-stock thresholds.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8l8-4 8 4v8l-8 4-8-4z" />
          <path d="M4 8l8 4 8-4" />
          <path d="M12 12v8" />
        </svg>
      ),
    },
    {
      name: "Purchases",
      sub: "GRN flow, supplier ledgers, ITC capture per invoice.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7h3l2 11h9l2-8H7" />
          <circle cx="10" cy="20" r="1.4" />
          <circle cx="17" cy="20" r="1.4" />
        </svg>
      ),
    },
    {
      name: "Reports",
      sub: "GSTR-1, GSTR-3B, Trial Balance, P&L straight from the ledger.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20V8M10 20V4M16 20v-8M22 20H2" />
        </svg>
      ),
    },
    {
      name: "Auth & Roles",
      sub: "JWT with refresh tokens, four roles, per-route RBAC.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      ),
    },
  ];

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="relative max-w-6xl mx-auto px-6 py-28 sm:py-32">
        <IridescentHalo spread={1.4} intensity={0.35} />
        <div className="max-w-2xl mb-16">
          <h2 className="text-4xl sm:text-5xl font-semibold text-slate-900 tracking-[-0.035em] leading-[1.05]">
            <Typewriter
              text="One workspace for the whole distributor cycle, billing to ledger to compliance."
              split={48}
              splitClassName="text-slate-400"
              speed={55}
              once
            />
          </h2>
        </div>

        <div className="bg-slate-200/70 rounded-2xl overflow-hidden border border-slate-200/80">
        <div className="grid lg:grid-cols-3 gap-px">
          {/* Featured: Sales & Billing - spans 2 columns on lg */}
          <Reveal className="lg:col-span-2">
            <TiltCard intensity={4}>
            <div className="group h-full bg-white p-10 sm:p-12 relative overflow-hidden">
              <div className="flex items-start justify-between mb-10">
                <div>
                  <div className="text-[10px] tracking-[0.25em] uppercase text-emerald-700 font-semibold mb-3">
                    Featured
                  </div>
                  <div className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
                    Sales & Billing
                  </div>
                </div>
                <div className="w-12 h-12 text-emerald-700 opacity-90">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h12l4 4v12H4z" />
                    <path d="M16 4v4h4" />
                    <path d="M8 13h8M8 17h5" />
                  </svg>
                </div>
              </div>

              <p className="text-slate-600 text-base leading-relaxed max-w-md mb-10">
                Multi-item invoices with batch + expiry pickers, automatic
                CGST/SGST vs IGST routing based on state, and HSN-linked tax
                rules. Cancels reverse the stock and the ledger atomically.
              </p>

              <div className="flex flex-wrap gap-2">
                {[
                  "Batch + expiry",
                  "Auto GST routing",
                  "Cancel + return",
                  "Print / PDF",
                ].map((chip) => (
                  <span
                    key={chip}
                    className="text-xs text-slate-700 bg-slate-100 border border-slate-200/70 px-2.5 py-1 rounded-full"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
            </TiltCard>
          </Reveal>

          {/* Side featured: Ledger */}
          <Reveal delay={80}>
            <TiltCard intensity={5}>
            <div className="group h-full bg-white p-10 sm:p-12 relative">
              <div className="w-10 h-10 mb-8 text-emerald-700">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 4h11a2 2 0 012 2v14H8a2 2 0 01-2-2z" />
                  <path d="M6 4v16" />
                  <path d="M10 9h6M10 13h6" />
                </svg>
              </div>
              <div className="text-xl font-semibold text-slate-900 tracking-tight mb-3">
                Double-entry ledger
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                Every sale, purchase and return posts a balanced journal entry
                inside the same DB transaction. Reversals link both sides.
              </p>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <pre className="text-[11px] text-slate-600 font-mono leading-relaxed">
{`Dr  Sundry Debtors    11,800
Cr  Sales               10,000
Cr  GST Output - CGST      900
Cr  GST Output - SGST      900`}
                </pre>
              </div>
            </div>
            </TiltCard>
          </Reveal>

        </div>

        {/* Secondary row: 4 narrower modules */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px border-t border-slate-200/80">
          {SECONDARY.map((m, i) => (
            <Reveal key={m.name} delay={140 + i * 60}>
              <TiltCard intensity={6}>
              <div className="group h-full bg-white p-7 sm:p-8 transition-colors hover:bg-slate-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 text-emerald-700">{m.icon}</div>
                  <div className="text-sm font-semibold text-slate-900 tracking-tight">
                    {m.name}
                  </div>
                </div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  {m.sub}
                </div>
              </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
        </div>
      </div>
    </section>
  );
}

function Performance() {
  const STATS = [
    { value: 1146, suffix: "/s", label: "throughput", sub: "k6 · 2,000 VUs · 4 cores" },
    { value: 47, suffix: " ms", label: "p95 latency", sub: "dashboard hot path" },
    { value: 0, suffix: " %", label: "errors", sub: "213k requests · zero 5xx" },
    { value: 15300, suffix: "", label: "active users / box", sub: "ready for GSTR" },
  ];

  return (
    <section className="relative overflow-hidden bg-white text-slate-900">
      <div className="relative max-w-6xl mx-auto px-6 py-28 sm:py-32">
        <IridescentHalo spread={1.55} intensity={0.45} />

        <Reveal>
          <h2 className="relative text-4xl sm:text-5xl font-semibold text-slate-900 tracking-[-0.035em] leading-[1.05] max-w-2xl mb-16">
            The cluster doesn&apos;t blink,
            <span className="text-slate-400"> even at 2,000 VUs.</span>
          </h2>
        </Reveal>

        <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-8 lg:gap-x-10 mb-16">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 100}>
              <BigStat
                target={s.value}
                suffix={s.suffix}
                label={s.label}
                sub={s.sub}
              />
            </Reveal>
          ))}
        </div>

        {/* Footer: stack chips + link */}
        <Reveal delay={500}>
          <div className="relative flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono">
            <span className="text-slate-400 mr-1">stack ↦</span>
            {["k6", "Redis", "Postgres", "Node cluster", "compression"].map(
              (t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 rounded-full border border-slate-200 bg-white/60 backdrop-blur text-slate-700 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
                >
                  {t}
                </span>
              ),
            )}
            <a
              href="https://github.com/vini1237777/AyurvedERP/tree/main/server/load-tests"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-emerald-700 hover:text-emerald-900 font-semibold"
            >
              load-tests/ →
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function BigStat({
  target,
  suffix,
  label,
  sub,
}: {
  target: number;
  suffix: string;
  label: string;
  sub: string;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    const start = performance.now();
    const dur = 1400;
    const tick = (t: number) => {
      const pp = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - pp, 3);
      setV(target * eased);
      if (pp < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, target]);

  return (
    <div ref={ref}>
      <div
        className="text-[56px] sm:text-[72px] leading-[0.95] font-semibold tracking-[-0.045em] tabular-nums text-slate-900"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {Math.round(v).toLocaleString()}
        <span className="text-emerald-600">{suffix}</span>
      </div>
      <div
        className="mt-3 h-px bg-emerald-500/60 transition-all duration-1000 ease-out"
        style={{ width: visible ? "60%" : "0%" }}
      />
      <div className="mt-3 text-[11px] tracking-[0.2em] uppercase text-slate-700 font-semibold">
        {label}
      </div>
      <div className="mt-1 text-xs text-slate-500 font-mono">{sub}</div>
    </div>
  );
}

function Architecture() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="relative max-w-6xl mx-auto px-6 py-28 sm:py-32">
        <IridescentHalo spread={1.5} intensity={0.4} />
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left: diagram, takes 7 of 12 cols */}
          <Reveal className="lg:col-span-7">
            <div className="relative">
              <ArchitectureDiagram />
            </div>
          </Reveal>

          {/* Right: heading + layered annotations */}
          <div className="lg:col-span-5">
            <div>
              <h2 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-[-0.025em] leading-[1.1] mb-8 min-h-[3em]">
                <Typewriter
                  text="Built to scale sideways, not up."
                  speed={55}
                />
              </h2>

              <ol className="relative border-l border-slate-200 pl-6 space-y-7">
                <li className="relative">
                  <span className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-emerald-700" />
                  <div className="text-xs font-mono text-emerald-700 mb-1">
                    <Typewriter text="01 · edge" speed={50} caret={false} />
                  </div>
                  <div className="text-sm text-slate-900 font-semibold mb-1">
                    <Typewriter
                      text="Stateless workers"
                      speed={45}
                      caret={false}
                    />
                  </div>
                  <Reveal>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      Node cluster forks one Express worker per CPU. The kernel
                      load-balances connections; a crashed worker respawns
                      without dropping the rest.
                    </p>
                  </Reveal>
                </li>
                <li className="relative">
                  <span className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-emerald-700" />
                  <div className="text-xs font-mono text-emerald-700 mb-1">
                    <Typewriter text="02 · cache" speed={50} caret={false} />
                  </div>
                  <div className="text-sm text-slate-900 font-semibold mb-1">
                    <Typewriter
                      text="Read-through Redis"
                      speed={45}
                      caret={false}
                    />
                  </div>
                  <Reveal>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      Hot reads wrap in{" "}
                      <code className="text-emerald-700 text-[12px] px-1 bg-emerald-50 rounded">
                        cache.wrap
                      </code>{" "}
                      with TTL invalidation. Falls back to no-cache gracefully
                      if Redis is unreachable.
                    </p>
                  </Reveal>
                </li>
                <li className="relative">
                  <span className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-emerald-700" />
                  <div className="text-xs font-mono text-emerald-700 mb-1">
                    <Typewriter text="03 · data" speed={50} caret={false} />
                  </div>
                  <div className="text-sm text-slate-900 font-semibold mb-1">
                    <Typewriter
                      text="Postgres + Prisma"
                      speed={45}
                      caret={false}
                    />
                  </div>
                  <Reveal>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      21-table relational schema. Atomic transactions for
                      invoice + stock + ledger writes. Prisma keeps the type
                      story end-to-end.
                    </p>
                  </Reveal>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ArchitectureDiagram() {
  const [stage, setStage] = useState(0);
  const stages = ["edge", "cache", "data"] as const;

  const STAGE_INFO = [
    {
      title: "Edge · cluster",
      metrics: [
        { k: "throughput", v: "1,146 req/s" },
        { k: "workers", v: "4 active" },
        { k: "respawn", v: "auto" },
      ],
      code: "cluster.fork(); // per cpu",
    },
    {
      title: "Read-through cache",
      metrics: [
        { k: "p95 hit", v: "6.34 ms" },
        { k: "ttl", v: "30 s" },
        { k: "fallback", v: "graceful" },
      ],
      code: 'cache.wrap("dashboard:v1", 30, fetch)',
    },
    {
      title: "Atomic write path",
      metrics: [
        { k: "tables", v: "21" },
        { k: "isolation", v: "read-committed" },
        { k: "tx", v: "single" },
      ],
      code: "prisma.$transaction([invoice, stock, ledger])",
    },
  ];
  const info = STAGE_INFO[stage];

  const pill = (
    x: number,
    y: number,
    w: number,
    label: string,
    sub: string,
    tone: "ink" | "leaf" = "ink",
    dim: boolean = false,
  ) => {
    const fill = tone === "leaf" ? "#ecfdf5" : "#ffffff";
    const stroke = tone === "leaf" ? "#a7f3d0" : "#e2e8f0";
    const labelFill = tone === "leaf" ? "#065f46" : "#0f172a";
    return (
      <g
        style={{
          opacity: dim ? 0.35 : 1,
          transition: "opacity 400ms ease-out",
        }}
      >
        <rect
          x={x - w / 2}
          y={y - 22}
          width={w}
          height="44"
          rx="22"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.2"
          className="arch-pill"
        />
        <text
          x={x}
          y={y - 3}
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill={labelFill}
          fontFamily="ui-sans-serif, system-ui"
        >
          {label}
        </text>
        <text
          x={x}
          y={y + 12}
          textAnchor="middle"
          fontSize="10"
          fill="#64748b"
          fontFamily="ui-monospace, SFMono-Regular, monospace"
        >
          {sub}
        </text>
      </g>
    );
  };

  return (
    <div className="relative bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <style>{`
        @keyframes archFlow {
          to { stroke-dashoffset: -14; }
        }
        @keyframes archPulse {
          0%, 100% { opacity: 0.5; r: 3; }
          50% { opacity: 1; r: 5; }
        }
        @keyframes archBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.008); }
        }
        @keyframes archWorkerGlow {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.55; }
        }
        @keyframes archLiveBlink {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .arch-flow { stroke-dasharray: 6 6; animation: archFlow 1.2s linear infinite; }
        .arch-flow-slow { stroke-dasharray: 4 6; animation: archFlow 1.6s linear infinite; }
        .arch-pulse { transform-origin: center; animation: archPulse 1.6s ease-in-out infinite; }
        .arch-pulse-2 { animation: archPulse 1.6s ease-in-out infinite; animation-delay: 0.4s; }
        .arch-pulse-3 { animation: archPulse 1.6s ease-in-out infinite; animation-delay: 0.8s; }
        .arch-pulse-4 { animation: archPulse 1.6s ease-in-out infinite; animation-delay: 1.2s; }
        .arch-cluster { transform-origin: center; animation: archBreathe 4s ease-in-out infinite; }
        .arch-worker-glow { animation: archWorkerGlow 1.8s ease-in-out infinite; }
        .arch-live { animation: archLiveBlink 1.4s ease-in-out infinite; }
      `}</style>

      {/* Devtools-style top bar: window dots + tab strip */}
      <div className="flex items-center gap-3 bg-slate-50 border-b border-slate-200 px-3 py-2">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
        </div>
        <div className="flex-1 flex items-center gap-1 ml-2">
          {stages.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => setStage(i)}
              className={`text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 rounded-md transition-colors ${
                i === stage
                  ? "bg-white text-emerald-700 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <span className="text-slate-400 mr-1.5">0{i + 1}</span>
              {s}
            </button>
          ))}
        </div>
        <span className="text-[9px] font-mono text-slate-400 tracking-wider">
          {info.title}
        </span>
      </div>

      <div className="p-4 sm:p-6">

      <svg viewBox="0 0 460 360" className="w-full h-auto">
        <defs>
          <linearGradient id="cluster-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fafafa" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>
          <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Top: Load Balancer with live indicator */}
        {pill(230, 36, 180, "Load Balancer", "edge · accept-balanced", "ink", stage !== 0)}
        {stage === 0 && (
          <circle
            cx="148"
            cy="36"
            r="2.5"
            fill="#10b981"
            className="arch-live"
          />
        )}

        {/* Flow LB → cluster (only animates on stage 0) */}
        <path
          d="M 230 58 L 230 98"
          stroke={stage === 0 ? "#10b981" : "#cbd5e1"}
          strokeWidth="1.5"
          fill="none"
          className={stage === 0 ? "arch-flow" : ""}
          strokeDasharray={stage === 0 ? undefined : "3 3"}
          style={{ transition: "stroke 400ms ease-out" }}
        />
        {stage === 0 && [0, 0.6, 1.2].map((d, i) => (
          <circle key={i} r="2.5" fill="#10b981" opacity="0">
            <animateMotion
              dur="1.8s"
              repeatCount="indefinite"
              begin={`${d}s`}
              path="M 230 58 L 230 98"
            />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.15;0.85;1"
              dur="1.8s"
              repeatCount="indefinite"
              begin={`${d}s`}
            />
          </circle>
        ))}

        {/* Cluster container - breathes */}
        <g className="arch-cluster" style={{ transformBox: "fill-box" }}>
          <rect
            x="40"
            y="108"
            width="380"
            height="118"
            rx="14"
            fill="url(#cluster-bg)"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        </g>
        <text
          x="58"
          y="130"
          fontSize="9"
          fontWeight="700"
          fill="#047857"
          letterSpacing="1.4"
          fontFamily="ui-monospace, SFMono-Regular, monospace"
        >
          NODE CLUSTER · ×4 WORKERS
        </text>

        {/* 4 worker chips — active visual only on stage 0 */}
        {[
          { x: 100, n: "worker 1", cls: "arch-pulse" },
          { x: 190, n: "worker 2", cls: "arch-pulse-2" },
          { x: 280, n: "worker 3", cls: "arch-pulse-3" },
          { x: 370, n: "worker 4", cls: "arch-pulse-4" },
        ].map((w) => (
          <g
            key={w.n}
            style={{
              opacity: stage === 0 ? 1 : 0.45,
              transition: "opacity 400ms ease-out",
            }}
          >
            <rect
              x={w.x - 38}
              y={150}
              width="76"
              height="56"
              rx="8"
              fill="#ffffff"
              stroke={stage === 0 ? "#a7f3d0" : "#cbd5e1"}
              strokeWidth="1"
            />
            {stage === 0 && (
              <circle cx={w.x} cy={166} r="10" fill="url(#node-glow)" />
            )}
            <circle
              cx={w.x}
              cy={166}
              r="3"
              fill="#10b981"
              className={stage === 0 ? w.cls : ""}
            />
            <text
              x={w.x}
              y={186}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="#0f172a"
              fontFamily="ui-sans-serif, system-ui"
            >
              Express
            </text>
            <text
              x={w.x}
              y={199}
              textAnchor="middle"
              fontSize="8.5"
              fill="#64748b"
              fontFamily="ui-monospace, SFMono-Regular, monospace"
            >
              {w.n}
            </text>
          </g>
        ))}

        {/* Flow line cluster → Redis (active only on stage 1) */}
        <path
          d="M 150 226 L 150 270 L 130 270"
          stroke={stage === 1 ? "#10b981" : "#cbd5e1"}
          strokeWidth="1.5"
          fill="none"
          className={stage === 1 ? "arch-flow-slow" : ""}
          strokeDasharray={stage === 1 ? undefined : "3 3"}
          style={{ transition: "stroke 400ms ease-out" }}
        />
        {stage === 1 && [0, 0.8].map((d, i) => (
          <circle key={`r${i}`} r="2.2" fill="#10b981" opacity="0">
            <animateMotion
              dur="1.6s"
              repeatCount="indefinite"
              begin={`${d}s`}
              path="M 150 226 L 150 270 L 130 270"
            />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.15;0.85;1"
              dur="1.6s"
              repeatCount="indefinite"
              begin={`${d}s`}
            />
          </circle>
        ))}

        {/* Flow line cluster → Postgres (active only on stage 2) */}
        <path
          d="M 310 226 L 310 270 L 330 270"
          stroke={stage === 2 ? "#10b981" : "#cbd5e1"}
          strokeWidth="1.5"
          fill="none"
          className={stage === 2 ? "arch-flow-slow" : ""}
          strokeDasharray={stage === 2 ? undefined : "3 3"}
          style={{ transition: "stroke 400ms ease-out" }}
        />
        {stage === 2 && [0.2, 1].map((d, i) => (
          <circle key={`p${i}`} r="2.2" fill="#10b981" opacity="0">
            <animateMotion
              dur="1.6s"
              repeatCount="indefinite"
              begin={`${d}s`}
              path="M 310 226 L 310 270 L 330 270"
            />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.15;0.85;1"
              dur="1.6s"
              repeatCount="indefinite"
              begin={`${d}s`}
            />
          </circle>
        ))}

        {/* Cache + DB pills — dim when not the active stage */}
        {pill(130, 295, 170, "Redis", "TTL · graceful fallback", "leaf", stage !== 1)}
        {pill(330, 295, 170, "PostgreSQL", "Prisma · 21 tables", "leaf", stage !== 2)}

        {/* Live indicators — only on the active data tier */}
        {stage === 1 && (
          <circle cx="60" cy="295" r="2.5" fill="#10b981" className="arch-live" />
        )}
        {stage === 2 && (
          <circle cx="260" cy="295" r="2.5" fill="#10b981" className="arch-live" />
        )}
      </svg>
      </div>

      {/* Metrics strip — updates per stage */}
      <div className="border-t border-slate-200 bg-slate-50/50 px-4 sm:px-6 py-3 grid grid-cols-3 gap-4">
        {info.metrics.map((m) => (
          <div key={m.k}>
            <div className="text-[9px] tracking-[0.2em] uppercase text-slate-400 font-mono">
              {m.k}
            </div>
            <div className="text-sm text-slate-900 font-semibold tabular-nums mt-0.5">
              {m.v}
            </div>
          </div>
        ))}
      </div>

      {/* Code snippet */}
      <div className="bg-slate-950 px-4 sm:px-6 py-2.5 flex items-center gap-2">
        <span className="text-[9px] font-mono text-slate-500">›_</span>
        <code className="text-[11px] font-mono text-emerald-300 truncate">
          {info.code}
        </code>
      </div>

      {/* Footer: prev / dots / next — with attention pulse on next while at stage 0 */}
      <div className="border-t border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between bg-white">
        <button
          type="button"
          onClick={() => setStage((s) => Math.max(0, s - 1))}
          disabled={stage === 0}
          aria-label="Previous stage"
          className="text-[11px] font-medium text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Prev
        </button>

        <div className="flex gap-1.5">
          {stages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStage(i)}
              aria-label={`Stage ${i + 1}`}
              className="block h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === stage ? 28 : 8,
                backgroundColor: i === stage ? "#047857" : "#e2e8f0",
                cursor: "pointer",
              }}
            />
          ))}
        </div>

        <div className="relative">
          {stage < stages.length - 1 && (
            <span className="pointer-events-none absolute inset-0 rounded-full bg-emerald-500 opacity-50 animate-ping" />
          )}
          <button
            type="button"
            onClick={() => setStage((s) => Math.min(stages.length - 1, s + 1))}
            disabled={stage === stages.length - 1}
            aria-label="Next stage"
            className="relative text-[11px] font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-1.5 rounded-full flex items-center gap-1.5"
          >
            {stage === stages.length - 1 ? "End" : "Next"}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function SpecsCountNumber({
  target,
  suffix = "",
}: {
  target: number;
  suffix?: string;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    const start = performance.now();
    const dur = 1400;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, target]);

  return (
    <div
      ref={ref}
      className="text-5xl sm:text-6xl font-semibold text-slate-900 tracking-[-0.035em] mb-2 tabular-nums"
    >
      {Math.round(v).toLocaleString()}
      {suffix && <span className="text-emerald-700">{suffix}</span>}
    </div>
  );
}

function Specs() {
  const HIGHLIGHTS = [
    { n: 1000, suffix: "+", label: "seeded invoices" },
    { n: 20, suffix: "", label: "relational tables" },
    { n: 4, suffix: "", label: "user roles" },
    { n: 3, suffix: "", label: "GST returns" },
  ];

  const SPECS = [
    {
      group: "Architecture",
      items: [
        ["Frontend", "React 18, TypeScript, Tailwind, Vite"],
        ["Backend", "Node.js, Express, Prisma ORM"],
        ["Database", "PostgreSQL, 20 table relational schema"],
      ],
    },
    {
      group: "Business",
      items: [
        ["Billing", "Multi item, batch, expiry, auto GST routing"],
        ["Accounting", "Double entry, atomic transactions, trial balance"],
        ["Compliance", "GSTR 1, GSTR 3B, HSN §12 summary"],
      ],
    },
    {
      group: "Security",
      items: [
        ["Auth", "JWT, 4 roles, per route enforcement"],
        ["Crypto", "bcrypt password hash, token rotation"],
        ["Hardening", "CORS, request validation, 403 handling"],
      ],
    },
  ];

  return (
    <section className="relative overflow-hidden bg-white">
      <Sprig
        className="top-[30%] -left-10 opacity-30 hidden lg:block"
        factor={0.04}
        offset={3000}
        scale={1.2}
        variant={1}
      />
      <Sprig
        className="bottom-[20%] -right-10 opacity-30 hidden lg:block"
        factor={-0.05}
        offset={3300}
        scale={1.1}
        variant={3}
      />
      <div className="relative max-w-6xl mx-auto px-6 py-28 sm:py-36">
        <IridescentHalo spread={1.5} intensity={0.35} />
        <Reveal>
          <div className="text-center mb-20">
            <h2 className="text-[52px] sm:text-7xl font-semibold text-slate-900 tracking-[-0.04em] leading-[0.95]">
              Built in the open.
            </h2>
          </div>
        </Reveal>

        {/* Highlight numbers - count up when scrolled in */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-10 mb-24 border-y border-slate-200 py-12">
          {HIGHLIGHTS.map((h, i) => (
            <Reveal key={h.label} delay={i * 100}>
              <div className="text-center">
                <SpecsCountNumber target={h.n} suffix={h.suffix} />
                <div className="text-[11px] tracking-[0.15em] uppercase text-slate-500">
                  {h.label}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Spec list - staggered per-row reveals */}
        <div className="grid sm:grid-cols-3 gap-x-12 gap-y-12">
          {SPECS.map((g, gi) => (
            <div key={g.group}>
              <Reveal delay={gi * 120}>
                <div className="text-[11px] tracking-[0.25em] uppercase font-semibold text-slate-900 pb-3 mb-5 border-b border-slate-300">
                  {g.group}
                </div>
              </Reveal>
              <dl className="space-y-5">
                {g.items.map(([k, v], ii) => (
                  <Reveal key={k} delay={gi * 120 + 100 + ii * 90}>
                    <div>
                      <dt className="text-[11px] uppercase tracking-[0.1em] text-slate-500 font-medium mb-1">
                        {k}
                      </dt>
                      <dd className="text-sm text-slate-900 leading-relaxed">
                        {v}
                      </dd>
                    </div>
                  </Reveal>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Scroll-bound pinned showcase - laptop transforms continuously with scroll.
function IridescentHalo({
  spread = 1.1,
  intensity = 0.45,
}: {
  spread?: number;
  intensity?: number;
}) {
  return (
    <>
      <style>{`
        @keyframes haloSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes haloShift {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.55; }
          50% { transform: translate(-50%, -50%) scale(1.05); opacity: 0.72; }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-0"
        style={{
          width: `${spread * 100}%`,
          maxWidth: 1400,
          aspectRatio: "1 / 0.6",
          transform: "translate(-50%, -50%)",
          filter: "blur(90px)",
          animation: "haloShift 9s ease-in-out infinite",
        }}
      >
        <div
          className="absolute inset-0 rounded-[50%]"
          style={{
            background:
              "conic-gradient(from 0deg, #ff8a8a 0%, #ffd28a 14%, #fff48a 28%, #a8f0c2 42%, #8acdff 56%, #b69cff 70%, #ff9cce 84%, #ff8a8a 100%)",
            opacity: intensity,
            animation: "haloSpin 22s linear infinite",
            transformOrigin: "center",
          }}
        />
        {/* Stronger inner mask so content over the halo stays crisp */}
        <div
          className="absolute inset-[8%] rounded-[50%]"
          style={{
            background:
              "radial-gradient(closest-side, rgba(255,255,255,0.85), rgba(255,255,255,0.4) 55%, transparent 85%)",
          }}
        />
      </div>
    </>
  );
}

function PinnedShowcase() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();

  const sections = [
    {
      eyebrow: "Dashboard",
      title: "Numbers, live.",
      body: "Outstanding, low stock, expiring batches, GST payable, top customers. All derived from the same transactional source as every report.",
    },
    {
      eyebrow: "Invoicing",
      title: "Counter to PDF.",
      body: "Multi item entry with batch and expiry, automatic CGST and SGST or IGST routing, and a printable invoice that downloads as PDF.",
    },
    {
      eyebrow: "Compliance",
      title: "Ready for GSTR.",
      body: "GSTR 1 B2B and B2C splits, GSTR 3B with input tax credit and net payable, HSN wise §12 summary. All derived from the ledger.",
    },
  ];

  // Map scroll progress 0..1 into laptop transforms.
  // 0.00 → entering: tilted back, smaller
  // 0.15 → settled: flat, full size
  // 0.85 → still flat (held in place during text changes)
  // 1.00 → lifting away: slight scale + translate up
  const tEnter = Math.min(1, progress / 0.15);
  const tExit = Math.max(0, (progress - 0.85) / 0.15);
  const rotateX = 14 * (1 - tEnter) - 4 * tExit;
  const scale = 0.82 + 0.18 * tEnter - 0.06 * tExit;
  const translateY = 60 * (1 - tEnter) - 24 * tExit;

  // Which of 3 stages: 0,1,2 - split equally between p=0.15..0.85
  const middle = Math.max(0, Math.min(1, (progress - 0.15) / 0.7));
  const stage = middle < 0.34 ? 0 : middle < 0.67 ? 1 : 2;
  const stageProgress = (middle - stage / 3) * 3; // 0..1 within current stage

  return (
    <section
      ref={ref}
      className="relative bg-gradient-to-b from-white via-emerald-50/40 to-white"
      style={{ height: "320vh" }}
    >
      <Sprig
        className="top-[20%] -left-12 opacity-50 hidden sm:block"
        factor={0.05}
        offset={1200}
        scale={1.4}
        variant={3}
      />
      <Sprig
        className="top-[55%] -right-12 opacity-50 hidden sm:block"
        factor={-0.06}
        offset={1500}
        scale={1.3}
        variant={2}
      />

      <div className="sticky top-0 h-screen flex flex-col overflow-hidden">
        {/* Heading row */}
        <div className="pt-[10vh] pb-10 px-6 text-center min-h-[200px]">
          <div key={`title-${stage}`} className="stage-fade">
            <h3 className="text-[40px] sm:text-[56px] font-semibold text-slate-900 tracking-[-0.035em] leading-[0.98]">
              {sections[stage].title}
            </h3>
          </div>
        </div>

        {/* Laptop - takes remaining middle space */}
        <div
          className="relative flex-1 flex items-center justify-center w-full px-6 min-h-0"
          style={{ perspective: "1800px" }}
        >
          <IridescentHalo />
          <div
            className="relative w-full max-w-4xl"
            style={{
              transform: `rotateX(${rotateX}deg) scale(${scale}) translateY(${translateY}px)`,
              transformStyle: "preserve-3d",
              transition: "transform 80ms linear",
            }}
          >
            <LaptopFrame
              url={
                stage === 0
                  ? "aushadhi.app/"
                  : stage === 1
                    ? "aushadhi.app/sales"
                    : "aushadhi.app/reports/gst-r3"
              }
            >
              <ScreenDashboard show={stage === 0} />
              <ScreenInvoices show={stage === 1} />
              <ScreenGSTR show={stage === 2} />
            </LaptopFrame>
            <div className="mx-auto mt-2 h-6 w-[70%] bg-slate-900/10 blur-2xl rounded-full" />
          </div>
        </div>

        {/* Body copy + dots */}
        <div className="pb-[3vh] px-6 text-center min-h-[110px] flex flex-col justify-end">
          <p
            key={`body-${stage}`}
            className="stage-fade max-w-xl mx-auto text-slate-600 text-base sm:text-lg leading-relaxed mb-5"
          >
            {sections[stage].body}
          </p>
          <div className="flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  stage === i ? "w-8 bg-slate-900" : "w-4 bg-slate-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .stage-fade {
          animation: stageFadeIn 500ms ease-out;
        }
        @keyframes stageFadeIn {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}

function BillSection() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  // Bill animates as the section scrolls past
  const billRotateY = -20 + 28 * progress;
  const billRotateZ = -8 + 10 * progress;
  const billScale = 0.85 + 0.2 * Math.min(1, progress * 1.5);
  const billTranslateY = -40 + 60 * progress;

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-gradient-to-b from-stone-50 via-stone-100 to-stone-50 border-b border-stone-200"
    >
      <Sprig
        className="top-10 right-8 opacity-50 hidden sm:block"
        factor={0.07}
        offset={2400}
        scale={1.1}
        variant={1}
      />
      <Sprig
        className="bottom-10 left-8 opacity-40 hidden lg:block"
        factor={-0.05}
        offset={2600}
        scale={1}
        variant={3}
      />
      <div className="relative max-w-6xl mx-auto px-6 py-32 sm:py-40 grid lg:grid-cols-2 gap-16 items-center">
        <Reveal>
          <div>
            <h2 className="text-[44px] sm:text-6xl font-semibold text-slate-900 tracking-[-0.035em] leading-[0.98] mb-5">
              Tax compliant.
              <br />
              Counter ready.
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed mb-6">
              Every sale prints a GSTIN stamped invoice with HSN, batch, expiry,
              and the CGST and SGST or IGST split that India's tax authority
              expects. The same document downloads as PDF in a click.
            </p>
            <Link
              to="/login"
              className="inline-flex text-slate-900 font-medium underline underline-offset-4 decoration-stone-400 hover:decoration-slate-900"
            >
              See the billing flow
            </Link>
          </div>
        </Reveal>
        <div className="flex justify-center" style={{ perspective: "1400px" }}>
          <div
            className="w-[260px] sm:w-[320px]"
            style={{
              transform: `rotateY(${billRotateY}deg) rotateX(6deg) rotateZ(${billRotateZ}deg) scale(${billScale}) translateY(${billTranslateY}px)`,
              transformStyle: "preserve-3d",
              transition: "transform 80ms linear",
            }}
          >
            <PharmacyBill />
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  const scale = 0.92 + 0.1 * Math.min(1, progress * 2);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-gradient-to-b from-white via-emerald-50/40 to-white"
    >
      <Sprig
        className="top-10 -left-6 opacity-50 hidden sm:block"
        factor={0.06}
        offset={3800}
        scale={1.2}
        variant={2}
      />
      <Sprig
        className="bottom-10 -right-6 opacity-50 hidden sm:block"
        factor={-0.06}
        offset={4000}
        scale={1.1}
        variant={1}
      />
      <div className="relative max-w-4xl mx-auto px-6 py-32 sm:py-40 text-center">
        <Reveal>
          <div
            style={{
              transform: `scale(${scale})`,
              transition: "transform 80ms linear",
            }}
          >
            <h2 className="text-[64px] sm:text-[112px] font-semibold text-slate-900 tracking-[-0.045em] leading-[0.92] mb-7">
              Start
              <br />
              exploring.
            </h2>
            <p className="text-slate-500 text-lg sm:text-xl font-light tracking-tight max-w-lg mx-auto mb-10">
              Sign in with any of the four demo roles. No setup. No signup.
            </p>
            <Link
              to="/login"
              className="inline-block bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-7 py-3 rounded-full shadow-md shadow-emerald-700/20 text-base transition-colors"
            >
              Go to sign in
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between text-[11px] text-slate-400 tracking-wider">
        <span>© AUSHADHI</span>
        <span>A portfolio demo</span>
      </div>
    </footer>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full">
      <div className="bg-slate-900 rounded-[34px] p-1.5 shadow-2xl shadow-slate-900/30 ring-1 ring-slate-800/60">
        <div className="bg-white rounded-[28px] overflow-hidden aspect-[9/19] relative">
          {/* Notch */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-10 h-4 w-16 bg-slate-900 rounded-full" />
          <div className="relative h-full">{children}</div>
        </div>
      </div>
    </div>
  );
}

function ScreenPhone() {
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white to-slate-50">
      {/* Status bar */}
      <div className="h-7 flex items-center justify-between px-4 text-[8px] font-semibold text-slate-900 pt-2">
        <span>9:41</span>
        <div className="flex items-center gap-0.5">
          <span className="inline-block w-1 h-1 rounded-full bg-slate-900" />
          <span className="inline-block w-1 h-1.5 rounded-full bg-slate-900" />
          <span className="inline-block w-1 h-2 rounded-full bg-slate-900" />
        </div>
      </div>

      {/* App header */}
      <div className="px-3.5 pt-2">
        <div className="text-[8px] tracking-[0.15em] uppercase text-emerald-700 font-semibold">
          GSTR-3B · live
        </div>
        <div className="text-base font-semibold text-slate-900 tracking-tight mt-0.5">
          ₹48,120
          <span className="text-emerald-600 text-[10px] ml-1 font-medium">
            net payable
          </span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="px-3.5 mt-3">
        <svg viewBox="0 0 220 70" className="w-full h-12">
          <defs>
            <linearGradient id="ph-spark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 50 L25 45 L50 55 L75 30 L100 35 L125 18 L150 25 L175 12 L200 20 L220 6"
            stroke="#10b981"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M0 50 L25 45 L50 55 L75 30 L100 35 L125 18 L150 25 L175 12 L200 20 L220 6 L220 70 L0 70 Z"
            fill="url(#ph-spark)"
          />
        </svg>
      </div>

      {/* Mini stat cards */}
      <div className="px-3.5 mt-2 grid grid-cols-2 gap-1.5">
        {[
          { l: "Output", v: "₹62,400", c: "text-slate-900" },
          { l: "Input ITC", v: "₹14,280", c: "text-emerald-700" },
        ].map((c) => (
          <div key={c.l} className="bg-white border border-slate-200 rounded-md px-2 py-1.5">
            <div className="text-[7px] uppercase tracking-wider text-slate-400">
              {c.l}
            </div>
            <div className={`text-[10px] font-semibold ${c.c}`}>{c.v}</div>
          </div>
        ))}
      </div>

      {/* List rows */}
      <div className="mt-3 px-3.5 flex-1">
        <div className="text-[8px] uppercase tracking-wider text-slate-400 mb-1.5">
          Recent invoices
        </div>
        {[
          ["INV-1247", "Sunrise Pharma", "₹3,240"],
          ["INV-1246", "Dilip Salunkhe", "₹1,820"],
          ["INV-1245", "Mod Mane Agencies", "₹5,610"],
          ["INV-1244", "Vinod Joshi", "₹4,150"],
        ].map(([no, name, amt]) => (
          <div
            key={no}
            className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0"
          >
            <div className="min-w-0">
              <div className="text-[8.5px] font-semibold text-slate-900">
                {no}
              </div>
              <div className="text-[7.5px] text-slate-500 truncate">
                {name}
              </div>
            </div>
            <div className="text-[8.5px] font-semibold text-slate-900">
              {amt}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom tab bar */}
      <div className="h-9 bg-white/80 backdrop-blur border-t border-slate-100 flex items-center justify-around px-3 pb-1">
        {[
          { d: "M3 12l9-9 9 9M5 10v10h14V10" },
          { d: "M4 4h16v4H4zM4 12h16v4H4z" },
          { d: "M4 6h16M4 12h16M4 18h16" },
        ].map((i, idx) => (
          <svg
            key={idx}
            viewBox="0 0 24 24"
            className={`w-3.5 h-3.5 ${idx === 0 ? "text-emerald-700" : "text-slate-400"}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={i.d} />
          </svg>
        ))}
      </div>
      <div className="mx-auto mb-1 h-0.5 w-10 bg-slate-900 rounded-full opacity-70" />
    </div>
  );
}

function LaptopFrame({
  children,
  url = "aushadhi.app/",
}: {
  children: React.ReactNode;
  url?: string;
}) {
  return (
    <div className="relative mx-auto w-full">
      <div className="bg-slate-900 rounded-[20px] p-3 shadow-2xl shadow-slate-900/30 ring-1 ring-slate-800/60">
        <div className="bg-white rounded-[14px] overflow-hidden aspect-[16/10] relative">
          {/* Browser chrome */}
          <div className="h-8 bg-slate-100 flex items-center px-3 gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
            <div className="flex-1 mx-4 h-4 rounded bg-white border border-slate-200 flex items-center justify-center">
              <span className="text-[9px] text-slate-400 truncate">{url}</span>
            </div>
          </div>
          {/* Screen content */}
          <div className="relative h-[calc(100%-2rem)]">{children}</div>
        </div>
      </div>
      <div className="mx-auto h-1.5 w-[94%] bg-slate-800 rounded-b-md" />
      <div className="mx-auto h-3 w-[80%] bg-gradient-to-b from-slate-300 to-slate-200 rounded-b-2xl shadow-lg" />
    </div>
  );
}

function ScreenDashboard({ show }: { show: boolean }) {
  const row1 = [
    { l: "Today's Net Sales", v: "₹3,24,580" },
    { l: "This Month Net", v: "₹48,12,300" },
    { l: "Total Invoices", v: "1,247" },
    { l: "Today's Returns", v: "₹4,200" },
    { l: "This Month Returns", v: "₹1,18,450" },
  ];
  const row2 = [
    { l: "Outstanding Amount", v: "₹12,84,000", sub: "Σ unpaid SAVED invoices" },
    { l: "Low Stock", v: "12", sub: "batches below 10 qty" },
    { l: "Expiring Batches", v: "8", sub: "within next 90 days" },
    { l: "GST Payable", v: "₹2,25,200", sub: "Output − Input" },
    { l: "Top Customers", v: "₹3.2 L", sub: "Patel Medical · #1" },
  ];

  return (
    <div
      className={`absolute inset-0 bg-slate-50 transition-opacity duration-500 ${
        show ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex h-full">
        {/* Mock sidebar */}
        <div className="w-[58px] bg-white border-r border-slate-200 py-2 px-1.5 flex flex-col gap-0.5">
          <div className="text-[7px] font-bold text-slate-800 mb-1 px-1">
            Aushadhi
          </div>
          {[
            "Dashboard",
            "New Sale",
            "All Invoices",
            "Purchases",
            "Customers",
            "Items",
            "Reports",
          ].map((n, i) => (
            <div
              key={n}
              className={`text-[6px] px-1.5 py-1 rounded ${i === 0 ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-500"}`}
            >
              {n}
            </div>
          ))}
        </div>
        {/* Main */}
        <div className="flex-1 p-3 overflow-hidden">
          <div className="text-[10px] font-bold text-slate-800">Dashboard</div>
          <div className="text-[7px] text-slate-500 mb-2">Welcome to ERP</div>
          {/* Demo banner */}
          <div className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5 mb-2 flex items-center justify-between">
            <div>
              <div className="text-[7px] font-semibold text-blue-900">
                Demo data
              </div>
              <div className="text-[6px] text-blue-700">
                Seeded mock records. No client data shown.
              </div>
            </div>
            <span className="rounded-full bg-white px-1.5 py-0.5 text-[6px] font-semibold text-blue-700 border border-blue-200">
              Portfolio preview
            </span>
          </div>
          {/* Row 1 */}
          <div className="grid grid-cols-5 gap-1 mb-1.5">
            {row1.map((c) => (
              <div
                key={c.l}
                className="bg-white border border-slate-200 rounded p-1.5"
              >
                <div className="text-[6px] text-slate-500 mb-0.5">{c.l}</div>
                <div className="text-[9px] font-bold text-slate-800">{c.v}</div>
              </div>
            ))}
          </div>
          {/* Row 2 */}
          <div className="grid grid-cols-5 gap-1 mb-2">
            {row2.map((c) => (
              <div
                key={c.l}
                className="bg-white border border-slate-200 rounded p-1.5"
              >
                <div className="text-[6px] text-slate-500 mb-0.5">{c.l}</div>
                <div className="text-[9px] font-bold text-slate-800">{c.v}</div>
                <div className="text-[5px] text-slate-400 mt-0.5">{c.sub}</div>
              </div>
            ))}
          </div>
          {/* Recent invoices + returns */}
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { title: "Recent Invoices", rows: ["#INV-1004  Aushadhi Pharmacy   ₹12,420", "#INV-1003  Patel Medical       ₹8,790", "#INV-1002  Herbal Hub          ₹15,300"] },
              { title: "Recent Returns", rows: ["#SR-12  Patel Medical    ₹720", "#SR-11  Herbal Hub       ₹2,150", "#SR-10  Vedic Roots      ₹450"] },
            ].map((sec) => (
              <div
                key={sec.title}
                className="bg-white border border-slate-200 rounded overflow-hidden"
              >
                <div className="px-2 py-1 border-b border-slate-100 text-[7px] font-semibold text-slate-700">
                  {sec.title}
                </div>
                {sec.rows.map((r) => (
                  <div
                    key={r}
                    className="text-[6px] font-mono text-slate-600 px-2 py-1 border-b border-slate-50 last:border-0"
                  >
                    {r}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScreenInvoices({ show }: { show: boolean }) {
  return (
    <div
      className={`absolute inset-0 bg-slate-50 transition-opacity duration-500 ${
        show ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex h-full">
        <div className="w-[58px] bg-white border-r border-slate-200 py-2 px-1.5 flex flex-col gap-0.5">
          <div className="text-[7px] font-bold text-slate-800 mb-1 px-1">
            Aushadhi
          </div>
          {[
            ["Dashboard", false],
            ["New Sale", false],
            ["All Invoices", true],
            ["Purchases", false],
            ["Customers", false],
            ["Items", false],
            ["Reports", false],
          ].map(([n, a]) => (
            <div
              key={n as string}
              className={`text-[6px] px-1.5 py-1 rounded ${a ? "bg-amber-50 text-amber-700 font-semibold" : "text-slate-500"}`}
            >
              {n as string}
            </div>
          ))}
        </div>
        <div className="flex-1 p-3 overflow-hidden">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <div className="text-[10px] font-bold text-slate-800">
                All Invoices
              </div>
              <div className="text-[7px] text-slate-500">
                94 invoices · Total: ₹48,12,300
              </div>
            </div>
            <div className="text-[7px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-semibold">
              + New Sale
            </div>
          </div>
          {/* FY tabs */}
          <div className="flex gap-1 mb-2">
            {["2026-27", "2025-26", "2024-25"].map((fy, i) => (
              <div
                key={fy}
                className={`text-[6px] px-1.5 py-0.5 rounded ${i === 0 ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}
              >
                {fy}
              </div>
            ))}
            <div className="flex-1" />
            <div className="text-[6px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-500">
              Search…
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <div className="grid grid-cols-[60px_70px_1fr_70px_50px_60px] text-[6px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1.5 bg-slate-50">
              <span>No.</span>
              <span>Date</span>
              <span>Customer</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Status</span>
              <span className="text-right">Actions</span>
            </div>
            {[
              ["INV-1004", "24/05/26", "Aushadhi Pharmacy", "₹12,420"],
              ["INV-1003", "24/05/26", "Patel Medical Store", "₹8,790"],
              ["INV-1002", "23/05/26", "Herbal Hub Wellness", "₹15,300"],
              ["INV-1001", "23/05/26", "Vedic Roots Retail", "₹6,540"],
              ["INV-1000", "22/05/26", "Saraswati Apothecary", "₹22,100"],
              ["INV-0999", "22/05/26", "Ganga Pharma", "₹4,820"],
              ["INV-0998", "21/05/26", "Aroma Naturals", "₹17,640"],
            ].map(([n, d, c, a]) => (
              <div
                key={n}
                className="grid grid-cols-[60px_70px_1fr_70px_50px_60px] text-[7px] px-2 py-1 border-b border-slate-100 last:border-0 items-center"
              >
                <span className="font-mono text-blue-700 font-semibold">
                  #{n}
                </span>
                <span className="text-slate-600">{d}</span>
                <span className="text-slate-700 truncate">{c}</span>
                <span className="text-right font-mono font-semibold text-slate-800">
                  {a}
                </span>
                <span className="text-right">
                  <span className="text-[6px] bg-emerald-100 text-emerald-700 px-1 py-px rounded font-semibold">
                    SAVED
                  </span>
                </span>
                <span className="text-right text-[6px] text-blue-600 font-semibold">
                  Print · PDF
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScreenGSTR({ show }: { show: boolean }) {
  return (
    <div
      className={`absolute inset-0 bg-slate-50 transition-opacity duration-500 ${
        show ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex h-full">
        <div className="w-[58px] bg-white border-r border-slate-200 py-2 px-1.5 flex flex-col gap-0.5">
          <div className="text-[7px] font-bold text-slate-800 mb-1 px-1">
            Aushadhi
          </div>
          {[
            ["Dashboard", false],
            ["New Sale", false],
            ["All Invoices", false],
            ["Purchases", false],
            ["Customers", false],
            ["Items", false],
            ["Reports", true],
          ].map(([n, a]) => (
            <div
              key={n as string}
              className={`text-[6px] px-1.5 py-1 rounded ${a ? "bg-sky-50 text-sky-700 font-semibold" : "text-slate-500"}`}
            >
              {n as string}
            </div>
          ))}
        </div>
        <div className="flex-1 p-3 overflow-hidden">
          <div className="mb-2">
            <div className="text-[10px] font-bold text-slate-800">
              GSTR-3B Report
            </div>
            <div className="text-[7px] text-slate-500">
              Summary return · FY 2026-27
            </div>
          </div>
          {/* Top stats */}
          <div className="grid grid-cols-3 gap-1 mb-2">
            {[
              ["Total Invoices", "1,247"],
              ["Taxable Amount", "₹38,46,000"],
              ["Total Tax", "₹4,12,560"],
            ].map(([l, v]) => (
              <div
                key={l as string}
                className="bg-white border border-slate-200 rounded p-1.5"
              >
                <div className="text-[6px] text-slate-500">{l}</div>
                <div className="text-[10px] font-bold text-slate-800">{v}</div>
              </div>
            ))}
          </div>
          {/* 3.1 Outward */}
          <div className="bg-white border border-slate-200 rounded p-2 mb-1.5">
            <div className="text-[7px] font-semibold text-slate-700 mb-1.5">
              3.1 Outward Taxable Supplies
            </div>
            <div className="grid grid-cols-5 text-[6px] font-semibold text-slate-500 border-b border-slate-100 pb-0.5 mb-0.5">
              <span>Description</span>
              <span className="text-right">Taxable</span>
              <span className="text-right">IGST</span>
              <span className="text-right">CGST</span>
              <span className="text-right">SGST</span>
            </div>
            <div className="grid grid-cols-5 text-[6.5px] py-0.5">
              <span className="text-slate-700 truncate">Outward taxable</span>
              <span className="text-right font-mono font-bold text-slate-800">
                ₹38,46,000
              </span>
              <span className="text-right font-mono">₹68,420</span>
              <span className="text-right font-mono">₹1,72,070</span>
              <span className="text-right font-mono">₹1,72,070</span>
            </div>
          </div>
          {/* 4. ITC */}
          <div className="bg-white border border-slate-200 rounded p-2 mb-1.5">
            <div className="text-[7px] font-semibold text-slate-700 mb-1">
              4. Eligible ITC
            </div>
            <div className="grid grid-cols-4 text-[6.5px]">
              <span className="text-slate-600">Inward supplies</span>
              <span className="text-right font-mono">IGST ₹38,940</span>
              <span className="text-right font-mono">CGST ₹74,210</span>
              <span className="text-right font-mono">SGST ₹74,210</span>
            </div>
          </div>
          {/* 6.1 Net */}
          <div className="bg-sky-600 text-white rounded p-2 grid grid-cols-4 items-center">
            <div className="text-[7px] uppercase tracking-wider font-semibold opacity-90 col-span-2">
              6.1 Net Tax Payable
            </div>
            <div className="text-right text-[7px] opacity-90">IGST · CGST · SGST</div>
            <div className="text-right text-[11px] font-bold font-mono">
              ₹2,25,200
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Pharmacy bill - printed invoice mockup
function PharmacyBill() {
  return (
    <div
      className="relative bg-white shadow-2xl shadow-slate-900/30"
      style={{
        clipPath:
          "polygon(0 0, 100% 0, 100% calc(100% - 12px), 95% 100%, 90% calc(100% - 12px), 85% 100%, 80% calc(100% - 12px), 75% 100%, 70% calc(100% - 12px), 65% 100%, 60% calc(100% - 12px), 55% 100%, 50% calc(100% - 12px), 45% 100%, 40% calc(100% - 12px), 35% 100%, 30% calc(100% - 12px), 25% 100%, 20% calc(100% - 12px), 15% 100%, 10% calc(100% - 12px), 5% 100%, 0 calc(100% - 12px))",
      }}
    >
      <div className="p-5 pb-8">
        <div className="text-center border-b border-dashed border-slate-300 pb-2.5 mb-3">
          <div className="text-[9px] tracking-[0.25em] text-slate-700 uppercase font-semibold">
            Aushadhi Wellness Pvt Ltd
          </div>
          <div className="text-[7px] text-slate-400 mt-1">
            GSTIN 27AAAAA0000A1Z5
          </div>
          <div className="text-[7px] text-slate-400">Maharashtra, India</div>
        </div>
        <div className="flex justify-between text-[8px] mb-1">
          <span className="text-slate-500">Invoice No.</span>
          <span className="font-mono font-bold text-slate-800">INV-1004</span>
        </div>
        <div className="flex justify-between text-[8px] mb-1">
          <span className="text-slate-500">Date</span>
          <span className="font-mono text-slate-700">24/05/2026</span>
        </div>
        <div className="flex justify-between text-[8px] mb-2.5">
          <span className="text-slate-500">Customer</span>
          <span className="font-semibold text-slate-800">Patel Medical</span>
        </div>
        <div className="border-t border-b border-slate-300 py-2 space-y-1 mb-2.5">
          <div className="grid grid-cols-[1fr_22px_46px] text-[7px] text-slate-500 font-semibold uppercase tracking-wider pb-0.5">
            <span>Item</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Amount</span>
          </div>
          {[
            ["Triphala Churna 100g", "2", "₹1,250"],
            ["Ashwagandha Cap 60s", "3", "₹2,400"],
            ["Brahmi Ghrita 250ml", "1", "₹3,200"],
            ["Mahasudarshan Tab", "5", "₹4,800"],
          ].map(([n, q, p]) => (
            <div
              key={n}
              className="grid grid-cols-[1fr_22px_46px] text-[7.5px] items-baseline"
            >
              <span className="text-slate-700 truncate">{n}</span>
              <span className="text-slate-500 text-right font-mono">{q}</span>
              <span className="text-slate-800 text-right font-mono font-semibold">
                {p}
              </span>
            </div>
          ))}
        </div>
        <div className="space-y-0.5 text-[7px] text-slate-600 mb-2">
          <div className="flex justify-between">
            <span>Taxable value</span>
            <span className="font-mono">₹11,650</span>
          </div>
          <div className="flex justify-between">
            <span>CGST @ 6%</span>
            <span className="font-mono">₹699</span>
          </div>
          <div className="flex justify-between">
            <span>SGST @ 6%</span>
            <span className="font-mono">₹699</span>
          </div>
        </div>
        <div className="border-t-2 border-slate-800 pt-1.5 flex justify-between text-[10px] font-bold text-slate-900">
          <span>TOTAL</span>
          <span className="font-mono">₹13,048</span>
        </div>
        <div className="text-center text-[6.5px] text-slate-400 mt-3 italic font-serif">
          स्वास्थ्यं भवतु
        </div>
      </div>
    </div>
  );
}
