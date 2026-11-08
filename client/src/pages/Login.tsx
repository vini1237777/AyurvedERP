import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { DEMO_ROLES } from "../auth/demoAccounts";

const fieldClass =
  "w-full border border-slate-200 rounded-lg bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all";

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

  const [email, setEmail] = useState<string>(DEMO_ROLES[0].email);
  const [password, setPassword] = useState<string>(DEMO_ROLES[0].password);
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
    <main className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center px-4 py-8">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
          A
        </div>
        <span className="font-bold text-slate-800 text-base">
          Aushadhi <span className="text-blue-600 font-semibold">ERP</span>
        </span>
      </div>

      <div className="w-full max-w-[400px] bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-xl font-bold text-slate-800 mb-5">Sign in</h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            signIn(email, password);
          }}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold text-slate-600 mb-1.5"
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
              className="block text-xs font-semibold text-slate-600 mb-1.5"
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
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {busyAs === email && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {busyAs === email ? "Signing in" : "Sign in"}
          </button>
        </form>

        <section
          aria-labelledby="demo-accounts"
          className="mt-6 pt-5 border-t border-slate-100"
        >
          <h2
            id="demo-accounts"
            className="text-sm font-semibold text-slate-800"
          >
            Try a demo account
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-3">
            Signs you in straight away. All the data is made up.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ROLES.map((account) => (
              <button
                key={account.role}
                type="button"
                disabled={busy}
                onClick={() => signIn(account.email, account.password)}
                className="text-left px-3 py-2 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-200 disabled:opacity-60 transition-colors"
              >
                <span className="block text-sm font-medium text-slate-800">
                  {busyAs === account.email ? "Signing in" : account.label}
                </span>
                <span className="block text-xs text-slate-500">
                  {account.hint}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
