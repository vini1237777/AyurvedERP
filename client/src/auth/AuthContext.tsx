import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  authApi,
  restoreSession,
  setAccessToken,
  type AuthUser,
} from "../utils/api";
import { queryClient } from "../utils/queryClient";

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // A reload starts with no access token; the refresh cookie gets a new one.
  useEffect(() => {
    restoreSession()
      .then((session) => setUser(session?.user ?? null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    queryClient.clear();
    setAccessToken(res.accessToken);
    setUser(res.user);
  };

  const logout = async () => {
    // Wait briefly so leaving the page doesn't cancel the request.
    await Promise.race([
      authApi.logout(),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
    setAccessToken(null);
    queryClient.clear();
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user)
    return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}
