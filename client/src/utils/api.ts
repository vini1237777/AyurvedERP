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

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    if (err?.response?.status === 403) {
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

// ─── Auth ─────────────────────────────────────────────────────────────────────
export type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: string;
};

// Drop-in fetch replacement that adds the Bearer token and handles 401 the
// same way the axios interceptor does. Use this in pages that call fetch()
// directly instead of going through the axios `api` instance.
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const token = localStorage.getItem("authToken");
  const headers = new Headers(init.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
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

export const authApi = {
  login: (email: string, password: string) =>
    api
      .post<{ token: string; user: AuthUser }>("/auth/login", { email, password })
      .then((r) => r.data),
  me: () => api.get<AuthUser>("/auth/me").then((r) => r.data),
};

// ─── Customers ────────────────────────────────────────────────────────────────
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

// ─── Items ────────────────────────────────────────────────────────────────────
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

// ─── Batches ──────────────────────────────────────────────────────────────────
export const batchApi = {
  getAll: (itemId?: number) =>
    api
      .get<Batch[]>(`/batches${itemId ? `?itemId=${itemId}` : ""}`)
      .then((r) => r.data),
  create: (data: BatchFormData) =>
    api.post<Batch>("/batches", data).then((r) => r.data),
  update: (id: number, data: Partial<BatchFormData>) =>
    api.put<Batch>(`/batches/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/batches/${id}`).then((r) => r.data),
};

// ─── Agents ───────────────────────────────────────────────────────────────────
export const agentApi = {
  getAll: () => api.get<Agent[]>("/agents").then((r) => r.data),
  create: (data: { name: string; mobile?: string }) =>
    api.post<Agent>("/agents", data).then((r) => r.data),
  update: (id: number, data: Partial<Agent>) =>
    api.put<Agent>(`/agents/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/agents/${id}`).then((r) => r.data),
};

// ─── HSN ──────────────────────────────────────────────────────────────────────
export const hsnApi = {
  getAll: () => api.get<HsnCode[]>("/hsn").then((r) => r.data),
  create: (data: { code: string; description?: string; gstRate: number }) =>
    api.post<HsnCode>("/hsn", data).then((r) => r.data),
  getTaxSlabs: () => api.get<TaxSlab[]>("/hsn/taxslabs").then((r) => r.data),
};

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const invoiceApi = {
  getAll: (params?: { from?: string; to?: string; customerId?: number }) =>
    api.get<Invoice[]>("/invoices", { params }).then((r) => r.data),

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

export const reportApi = {
  getSaleRegister: (params?: {
    from?: string;
    to?: string;
    customerId?: number;
  }) =>
    api
      .get<SaleRegisterRow[]>("/reports/sale-register", { params })
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
