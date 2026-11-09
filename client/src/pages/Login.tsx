import VisitorCount from "../components/VisitorCount";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { DEMO_ROLES } from "../auth/demoAccounts";

const fieldClass =
  "boxed w-full h-11 border-2 border-ink bg-[#FBFDF7] px-3 text-base text-ink";

// The medicine cabinet: real stock in this demo, one label to a drawer.
const DRAWERS = [
  "Chyawanprash",
  "Brahmi Vati",
  "Moringa",
  "Septilin",
  "Bhringraj Tel",
  "Triphala Churna",
  "Neem Tab",
  "Avipattikar",
  "Swarna Bhasma",
  "Drakshasava",
  "Mahanarayan Tel",
  "Giloy Vati",
  "Cystone",
  "Ashwagandha",
  "Anu Tail",
  "Kumaryasava",
  "Tulsi Drops",
  "Akik Pishti",
  "Karela Jamun",
  "Triphala Tab",
];

function signInError(err: any): string {
  if (err?.response?.status === 401) return "That email and password don't match.";
  if (err?.response?.data?.error) return err.response.data.error;
  return "We couldn't reach the server. Check your connection and try again.";
}

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: { from?: { pathname?: string } };
  };
  const from = location.state?.from?.pathname || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The email being signed in, so the right button shows the wait.
  const [busyAs, setBusyAs] = useState<string | null>(null);

  if (!loading && user) return <Navigate to={from} replace />;

  async function signIn(withEmail: string, withPassword: string) {
    setError(null);
    setBusyAs(withEmail);
    try {
      await login(withEmail.trim(), withPassword);
      navigate(from, { replace: true });
    } catch (err) {
      setError(signInError(err));
      setBusyAs(null);
    }
  }

  const busy = busyAs !== null;

  return (
    <div className="min-h-screen flex bg-paper text-ink">
      <div
        aria-hidden="true"
        className="hidden md:grid flex-[3] min-w-0 p-3.5 gap-1.5 bg-cloth grid-cols-[repeat(auto-fill,minmax(140px,1fr))] auto-rows-fr"
      >
        {DRAWERS.map((name) => (
          <div
            key={name}
            className="flex flex-col items-center justify-center gap-2.5 p-2.5 bg-[#B12A41]"
          >
            <span className="block w-full px-2 py-1.5 bg-paper text-ink border border-ink outline outline-1 outline-offset-1 outline-paper text-base font-semibold leading-tight text-center">
              {name}
            </span>
            <span className="w-5 h-5 rounded-full bg-thread border-2 border-[#A97B10]" />
          </div>
        ))}
      </div>

      <main className="flex-[2] min-w-0 flex flex-col justify-center gap-6 px-6 md:px-14 py-8">
        <div>
          <p
            lang="hi"
            className="font-deva font-extrabold text-[76px] leading-[1.15] text-cloth"
          >
            औषधि
          </p>
          <p className="text-xl font-medium">
            Billing, stock and GST for Ayurvedic medicine traders
          </p>
        </div>

        <div className="w-full max-w-[420px]">
          <h1 className="text-[28px] leading-tight font-bold mb-3">Sign in</h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              signIn(email, password);
            }}
            className="space-y-3.5"
          >
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium mb-1"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${fieldClass} pr-16`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-sm font-medium text-ink hover:bg-slate-50"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full min-h-[48px] bg-ink hover:bg-blue-700 disabled:opacity-60 text-white text-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {busyAs === email && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {busyAs === email ? "Signing in" : "Sign in"}
            </button>
          </form>
        </div>

        <section aria-labelledby="demo-accounts" className="w-full max-w-[420px]">
          <h2 id="demo-accounts" className="text-lg font-bold">
            Looking around? Open a demo account
          </h2>
          <p className="text-sm text-slate-600 mb-2">
            Signs you in straight away. All the data is made up.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ROLES.map((account) => (
              <button
                key={account.role}
                type="button"
                disabled={busy}
                onClick={() => signIn(account.email, account.password)}
                className="min-h-[44px] text-left px-3 py-1.5 border-2 border-ink hover:bg-slate-50 disabled:opacity-60 transition-colors"
              >
                <span className="block text-base font-semibold leading-tight">
                  {busyAs === account.email ? "Signing in" : account.label}
                </span>
                <span className="block text-xs text-slate-600">
                  {account.hint}
                </span>
              </button>
            ))}
          </div>
          <VisitorCount className="mt-3 text-slate-600" />
        </section>
      </main>
    </div>
  );
}
