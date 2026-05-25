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

// Decorative botanical sprig — rotates and drifts with scroll.
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
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
      className={`transition-all duration-1000 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header />
      <Hero />
      <PinnedShowcase />
      <BillSection />
      <Specs />
      <CTA />
      <Footer />
    </div>
  );
}

function Header() {
  return (
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
    <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white via-emerald-50/40 to-white">
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
        <div className="max-w-5xl mx-auto px-6 pb-16">
          <div className="relative mx-auto" style={{ perspective: "1800px" }}>
            <div
              style={{
                transform: "rotateX(2deg)",
                transformStyle: "preserve-3d",
              }}
            >
              <LaptopFrame>
                <ScreenDashboard show />
              </LaptopFrame>
            </div>
            {/* Subtle ground shadow */}
            <div className="mx-auto mt-2 h-6 w-[70%] bg-slate-900/10 blur-2xl rounded-full" />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Specs() {
  const HIGHLIGHTS = [
    { value: "1,000+", label: "seeded invoices" },
    { value: "20", label: "relational tables" },
    { value: "4", label: "user roles" },
    { value: "3", label: "GST returns" },
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
    <section className="relative overflow-hidden bg-white border-b border-slate-200">
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
        <Reveal>
          <div className="text-center mb-20">
            <div className="text-[11px] tracking-[0.25em] uppercase font-semibold text-emerald-700 mb-4">
              Real data, real ledger
            </div>
            <h2 className="text-[52px] sm:text-7xl font-semibold text-slate-900 tracking-[-0.04em] leading-[0.95]">
              Built in the open.
            </h2>
          </div>
        </Reveal>

        {/* Highlight numbers — integrated, light, no dark band */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-10 mb-24 border-y border-slate-200 py-12">
          {HIGHLIGHTS.map((h, i) => (
            <Reveal key={h.label} delay={i * 80}>
              <div className="text-center">
                <div className="text-5xl sm:text-6xl font-semibold text-slate-900 tracking-[-0.035em] mb-2">
                  {h.value}
                </div>
                <div className="text-[11px] tracking-[0.15em] uppercase text-slate-500">
                  {h.label}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Spec list — Apple tech-specs style, 3 columns of definition lists */}
        <Reveal>
          <div className="grid sm:grid-cols-3 gap-x-12 gap-y-12">
            {SPECS.map((g) => (
              <div key={g.group}>
                <div className="text-[11px] tracking-[0.25em] uppercase font-semibold text-slate-900 pb-3 mb-5 border-b border-slate-300">
                  {g.group}
                </div>
                <dl className="space-y-5">
                  {g.items.map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[11px] uppercase tracking-[0.1em] text-slate-500 font-medium mb-1">
                        {k}
                      </dt>
                      <dd className="text-sm text-slate-900 leading-relaxed">
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// Scroll-bound pinned showcase — laptop transforms continuously with scroll.
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

  // Which of 3 stages: 0,1,2 — split equally between p=0.15..0.85
  const middle = Math.max(0, Math.min(1, (progress - 0.15) / 0.7));
  const stage = middle < 0.34 ? 0 : middle < 0.67 ? 1 : 2;
  const stageProgress = (middle - stage / 3) * 3; // 0..1 within current stage

  return (
    <section
      ref={ref}
      className="relative bg-gradient-to-b from-white via-emerald-50/40 to-white border-b border-slate-200"
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
        <div className="pt-[5vh] px-6 text-center min-h-[140px]">
          <div key={`title-${stage}`} className="stage-fade">
            <div className="text-[11px] tracking-[0.25em] uppercase font-semibold text-slate-500 mb-3">
              {sections[stage].eyebrow}
            </div>
            <h3 className="text-[40px] sm:text-[56px] font-semibold text-slate-900 tracking-[-0.035em] leading-[0.98]">
              {sections[stage].title}
            </h3>
          </div>
        </div>

        {/* Laptop — takes remaining middle space */}
        <div
          className="flex-1 flex items-center justify-center w-full px-6 min-h-0"
          style={{ perspective: "1800px" }}
        >
          <div
            className="w-full max-w-4xl"
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
            <div className="text-[11px] tracking-[0.25em] uppercase font-semibold text-stone-500 mb-4">
              The printed bill
            </div>
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
          <div className="h-8 bg-slate-100 border-b border-slate-200 flex items-center px-3 gap-1.5">
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
            <div className="grid grid-cols-[60px_70px_1fr_70px_50px_60px] text-[6px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1.5 bg-slate-50 border-b border-slate-200">
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

// Pharmacy bill — printed invoice mockup
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
          <div className="grid grid-cols-[1fr_22px_46px] text-[7px] text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200 pb-0.5">
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
