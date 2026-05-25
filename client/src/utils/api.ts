import axios from "axios";
import type {
  Customer,
  Item,
  Batch,
  Agent,
  HsnCode,
  TaxSlab,
  Invoice,
  Company,
  CustomerFormData,
  ItemFormData,
  BatchFormData,
  CompanyFormData,
  GstReportResponse,
  StockReportResponse,
  SaleRegisterRow,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.trim() || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


let refreshInflight: Promise<string | null> | null = null;

async function tryRefreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;
  try {
    const res = await axios.post<{ accessToken: string; user: AuthUser }>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
    );
    const next = res.data.accessToken;
    if (next) {
      localStorage.setItem("authToken", next);
      if (res.data.user)
        localStorage.setItem("authUser", JSON.stringify(res.data.user));
      return next;
    }
    return null;
  } catch {
    return null;
  }
}

function clearAuthAndRedirect() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("authUser");
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err?.response?.status;
    const original = err?.config;

    if (status === 401 && original && !original._retry) {
      const url: string = original.url || "";
      if (url.includes("/auth/refresh") || url.includes("/auth/login")) {
        clearAuthAndRedirect();
        return Promise.reject(err);
      }

      original._retry = true;
      if (!refreshInflight) refreshInflight = tryRefreshAccessToken();
      const newToken = await refreshInflight;
      refreshInflight = null;

      if (newToken) {
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      clearAuthAndRedirect();
    }

    if (status === 403) {
      window.dispatchEvent(
        new CustomEvent("api:forbidden", {
          detail:
            err.response?.data?.error ||
            "You don't have permission to perform that action.",
        }),
      );
    }
    console.error("API Error:", err.response?.data || err.message);
    return Promise.reject(err);
  },
);

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: string;
};

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const buildHeaders = () => {
    const token = localStorage.getItem("authToken");
    const h = new Headers(init.headers || {});
    if (token && !h.has("Authorization")) {
      h.set("Authorization", `Bearer ${token}`);
    }
    if (!h.has("Content-Type") && init.body) {
      h.set("Content-Type", "application/json");
    }
    return h;
  };

  let res = await fetch(input, { ...init, headers: buildHeaders() });

  const urlStr = String(input);
  if (
    res.status === 401 &&
    !urlStr.includes("/auth/refresh") &&
    !urlStr.includes("/auth/login")
  ) {
    if (!refreshInflight) refreshInflight = tryRefreshAccessToken();
    const newToken = await refreshInflight;
    refreshInflight = null;
    if (newToken) {
      res = await fetch(input, { ...init, headers: buildHeaders() });
    } else {
      clearAuthAndRedirect();
    }
  }

  if (res.status === 403) {
    let msg = "You don't have permission to perform that action.";
    try {
      const body = await res.clone().json();
      if (body?.error) msg = body.error;
    } catch {}
    window.dispatchEvent(new CustomEvent("api:forbidden", { detail: msg }));
  }
  return res;
}

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  token?: string;
  user: AuthUser;
};

export const authApi = {
  login: (email: string, password: string) =>
    api
      .post<LoginResponse>("/auth/login", { email, password })
      .then((r) => r.data),
  refresh: () => {
    const refreshToken = localStorage.getItem("refreshToken");
    return api
      .post<{ accessToken: string; user: AuthUser }>("/auth/refresh", {
        refreshToken,
      })
      .then((r) => r.data);
  },
  me: () => api.get<AuthUser>("/auth/me").then((r) => r.data),
};

export const customerApi = {
  getAll: () => api.get<Customer[]>("/customers").then((r) => r.data),
  getById: (id: number) =>
    api.get<Customer>(`/customers/${id}`).then((r) => r.data),
  search: (q: string) =>
    api.get<Customer[]>(`/customers/search?q=${q}`).then((r) => r.data),
  create: (data: CustomerFormData) =>
    api.post<Customer>("/customers", data).then((r) => r.data),
  update: (id: number, data: Partial<CustomerFormData>) =>
    api.put<Customer>(`/customers/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/customers/${id}`).then((r) => r.data),
};

export const itemApi = {
  getAll: () => api.get<Item[]>("/items").then((r) => r.data),
  getById: (id: number) => api.get<Item>(`/items/${id}`).then((r) => r.data),
  search: (q: string) =>
    api.get<Item[]>(`/items/search?q=${q}`).then((r) => r.data),
  create: (data: ItemFormData) =>
    api.post<Item>("/items", data).then((r) => r.data),
  update: (id: number, data: Partial<ItemFormData>) =>
    api.put<Item>(`/items/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/items/${id}`).then((r) => r.data),
  getBatches: (id: number) =>
    api.get<Batch[]>(`/items/${id}/batches`).then((r) => r.data),
};

export const batchApi = {
  getAll: (itemId?: number) => {
    const qs = new URLSearchParams();
    if (itemId) qs.set("itemId", String(itemId));
    qs.set("limit", "0");
    return api.get<Batch[]>(`/batches?${qs.toString()}`).then((r) => r.data);
  },
  create: (data: BatchFormData) =>
    api.post<Batch>("/batches", data).then((r) => r.data),
  update: (id: number, data: Partial<BatchFormData>) =>
    api.put<Batch>(`/batches/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/batches/${id}`).then((r) => r.data),
};

export const agentApi = {
  getAll: () => api.get<Agent[]>("/agents").then((r) => r.data),
  create: (data: { name: string; mobile?: string }) =>
    api.post<Agent>("/agents", data).then((r) => r.data),
  update: (id: number, data: Partial<Agent>) =>
    api.put<Agent>(`/agents/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/agents/${id}`).then((r) => r.data),
};

export const hsnApi = {
  getAll: () => api.get<HsnCode[]>("/hsn").then((r) => r.data),
  create: (data: { code: string; description?: string; gstRate: number }) =>
    api.post<HsnCode>("/hsn", data).then((r) => r.data),
  getTaxSlabs: () => api.get<TaxSlab[]>("/hsn/taxslabs").then((r) => r.data),
};

export type InvoicePage = {
  rows: Invoice[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

export const invoiceApi = {
  getAll: (params?: {
    from?: string;
    to?: string;
    customerId?: number;
    financialYear?: string;
    page?: number;
    limit?: number;
  }) =>
    api
      .get<InvoicePage>("/invoices", {
        params: { page: 1, limit: 50, ...params },
      })
      .then((r) => r.data),

  getById: (id: number) =>
    api.get<Invoice>(`/invoices/${id}`).then((r) => r.data),

  create: (data: any) =>
    api.post<Invoice>("/invoices", data).then((r) => r.data),

  cancel: (id: number) => api.put(`/invoices/${id}/cancel`).then((r) => r.data),

  createReturn: (
    id: number,
    data: {
      reason?: string;
      items: { invoiceItemId: number; qty: number }[];
    },
  ) => api.post(`/invoices/${id}/return`, data).then((r) => r.data),
};

export type SaleRegisterPage = {
  rows: SaleRegisterRow[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

export const reportApi = {
  getSaleRegister: (params?: {
    from?: string;
    to?: string;
    customerId?: number;
    page?: number;
    limit?: number;
  }) =>
    api
      .get<SaleRegisterPage>("/reports/sale-register", {
        params: { page: 1, limit: 50, ...params },
      })
      .then((r) => r.data),

  getSaleRegisterAll: (params?: {
    from?: string;
    to?: string;
    customerId?: number;
  }) =>
    api
      .get<SaleRegisterRow[]>("/reports/sale-register", {
        params: { ...params, limit: 0 },
      })
      .then((r) => r.data),

  getGstReport: (params?: { from?: string; to?: string }) =>
    api.get<GstReportResponse>("/reports/gst", { params }).then((r) => r.data),

  getStockReport: () =>
    api.get<StockReportResponse>("/reports/stock").then((r) => r.data),
};

export const companyApi = {
  get: () => api.get<Company | null>("/company").then((r) => r.data),
  save: (data: CompanyFormData) =>
    api.put<Company>("/company", data).then((r) => r.data),
};

export const salesReturnApi = {
  getAll: () => api.get("/invoices/returns/all").then((r) => r.data),
  getById: (id: number) =>
    api.get(`/invoices/returns/${id}`).then((r) => r.data),
};

export default api;
