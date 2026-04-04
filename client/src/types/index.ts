// ─── Master Types ─────────────────────────────────────────────────────────────

export interface Customer {
  id: number;
  name: string;
  gstin?: string;
  pan?: string;
  dlNo?: string;
  state: string;
  stateCode: string;
  address?: string;
  city?: string;
  pincode?: string;
  mobile?: string;
  phone?: string;
  email?: string;
  balance: number;
  isActive: boolean;
  createdAt: string;
}

export interface Agent {
  id: number;
  name: string;
  mobile?: string;
  isActive: boolean;
}

export interface HsnCode {
  id: number;
  code: string;
  description?: string;
  gstRate: number;
}

export interface TaxSlab {
  id: number;
  name: string;
  rate: number;
}

export interface Batch {
  id: number;
  itemId: number;
  batchNo: string;
  expiryDate?: string;
  mfgDate?: string;
  purchasePrice?: number;
  salePrice?: number;
  mrp?: number;
  openingQty: number;
  currentQty: number;
}

export interface Item {
  id: number;
  name: string;
  shortName?: string;
  hsnId: number;
  hsn: HsnCode;
  taxSlabId: number;
  taxSlab: TaxSlab;
  unit: string;
  altUnit?: string;
  altFactor: number;
  maintainBatch: boolean;
  isActive: boolean;
  batches: Batch[];
  mrp?: number;
  rate?: number;
}

// ─── Invoice Types ────────────────────────────────────────────────────────────

export type TaxType = "CGST_SGST" | "IGST";

export interface SaleRow {
  id: number;
  itemName: string;
  itemId: number | null;
  batchNo: string;
  batchId: number | null;
  qty: string;
  altQty: string;
  free: string;
  price: string;
  per: string;
  basicAmt: number;
  disc: string;
  discAmt: number;
  taxPct: string;
  taxAmt: number;
  netValue: number;
  hsn: string;
  gst: number;
  mrp: number;
  _batches: Batch[];
  _item?: Item;
}

export interface Invoice {
  id: number;
  invoiceNo: number;
  invoiceDate: string;
  dueDate?: string;
  terms: string;
  customerId: number;
  customer: Customer;
  agentId?: number;
  agent?: Agent;
  customerGstin?: string;
  customerState: string;
  customerStateCode: string;
  taxType: TaxType;
  totalDiscount: number;
  totalTaxable: number;
  cgstAmt: number;
  sgstAmt: number;
  igstAmt: number;
  totalTax: number;
  grandTotal: number;
  status: string;
  items: InvoiceItem[];
  createdAt: string;
}

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  itemId: number;
  item: Item;
  batchId?: number;
  batch?: Batch;
  itemName: string;
  hsnCode: string;
  mrp?: number;
  rate: number;
  qty: number;
  altQty: number;
  freeQty: number;
  per: string;
  basicAmt: number;
  discPercent: number;
  discAmt: number;
  taxableAmt: number;
  gstPercent: number;
  taxAmt: number;
  netValue: number;
}

// ─── Form Types ───────────────────────────────────────────────────────────────

export interface CustomerFormData {
  name: string;
  gstin: string;
  pan: string;
  dlNo: string;
  state: string;
  stateCode: string;
  address: string;
  city: string;
  pincode: string;
  mobile: string;
  phone: string;
  email: string;
}

export interface ItemFormData {
  name: string;
  shortName: string;
  hsnId: string;
  taxSlabId: string;
  unit: string;
  altUnit: string;
  altFactor: string;
  maintainBatch: boolean;
  mrp: string;
  rate: string;
}

export interface BatchFormData {
  itemId: string;
  batchNo: string;
  expiryDate: string;
  mfgDate: string;
  purchasePrice: string;
  salePrice: string;
  mrp: string;
  openingQty: string;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
}

export interface SaleRegisterRow extends Invoice {}

export interface GstReportRow {
  id: number;
  invoiceNo: number;
  invoiceDate: string;
  customerName: string;
  customerGstin: string;
  taxType: string;
  taxableAmount: number;
  cgstAmt: number;
  sgstAmt: number;
  igstAmt: number;
  totalTax: number;
  grandTotal: number;
}

export interface GstReportResponse {
  rows: GstReportRow[];
  summary: {
    taxableAmount: number;
    cgstAmt: number;
    sgstAmt: number;
    igstAmt: number;
    totalTax: number;
    grandTotal: number;
  };
}

export interface StockReportRow {
  id: number;
  itemName: string;
  hsnCode: string;
  batchNo: string;
  expiryDate: string;
  openingQty: number;
  currentQty: number;
  mrp: number;
  salePrice: number;
}

export interface StockReportResponse {
  rows: StockReportRow[];
  summary: {
    totalBatches: number;
    totalOpeningQty: number;
    totalCurrentQty: number;
  };
}
