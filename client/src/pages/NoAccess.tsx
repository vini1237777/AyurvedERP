import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function NoAccess() {
  const { user } = useAuth();
  const nav = useNavigate();
  const params = new URLSearchParams(useLocation().search);
  const required = params.get("need")?.split(",").filter(Boolean) || [];
  const currentRole = (user as any)?.role || "-";

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4 text-amber-700">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1">
          You don't have access to this section
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Your role doesn't include permission for this page.
        </p>

        <div className="bg-slate-50 rounded-xl px-4 py-3 mb-6 text-left space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Signed in as</span>
            <span className="font-semibold text-slate-800">{user?.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Your role</span>
            <span className="font-mono text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-700">
              {currentRole}
            </span>
          </div>
          {required.length > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Required role</span>
              <span className="font-mono text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                {required.join(" or ")}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-center">
          <button
            onClick={() => nav(-1)}
            className="px-4 py-2 text-sm font-semibold border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Go back
          </button>
          <Link
            to="/dashboard"
            className="px-4 py-2 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
          >
            Dashboard
          </Link>
        </div>

        <p className="text-xs text-slate-400 mt-6">
          Need access? Ask an admin to update your role.
        </p>
      </div>
    </div>
  );
}
