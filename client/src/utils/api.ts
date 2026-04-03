import axios from "axios";
import type {
  Customer,
  Item,
  Batch,
  Agent,
  HsnCode,
  TaxSlab,
  Invoice,
  CustomerFormData,
  ItemFormData,
  BatchFormData,
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

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("API Error:", err.response?.data || err.message);
    return Promise.reject(err);
  },
);

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

export const salesReturnApi = {
  getAll: () => api.get("/invoices/returns/all").then((r) => r.data),
  getById: (id: number) =>
    api.get(`/invoices/returns/${id}`).then((r) => r.data),
};

export default api;
