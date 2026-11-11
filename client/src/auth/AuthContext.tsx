import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authApi, type AuthUser } from "../utils/api";
import { queryClient } from "../utils/queryClient";

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem("authUser");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((u) => {
        setUser(u);
        localStorage.setItem("authUser", JSON.stringify(u));
      })
      .catch(() => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    queryClient.clear();
    localStorage.setItem("authToken", res.accessToken);
    if (res.refreshToken)
      localStorage.setItem("refreshToken", res.refreshToken);
    localStorage.setItem("authUser", JSON.stringify(res.user));
    setUser(res.user);
  };

  const logout = async () => {
    // Wait briefly so leaving the page doesn't cancel the request.
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken)
      await Promise.race([
        authApi.logout(refreshToken),
        new Promise((r) => setTimeout(r, 1500)),
      ]);
    queryClient.clear();
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("authUser");
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
