import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  customerApi,
  itemApi,
  agentApi,
  invoiceApi,
  authFetch,
} from "../../utils/api";
import {
  fmt,
  fmtExpiry,
  fmtInt,
  fmtQty,
  isExpired,
  parseExpiry,
  COMPANY,
  SELLER_STATE,
} from "../../utils/invoice.utils";
import { Combobox } from "../../components/ui";
import type { Customer, Item, Agent, SaleRow, TaxType } from "../../types";

const r2 = (v: number) => Math.round(v * 100) / 100;
type ExtRow = SaleRow & { sDis: string };

function calcRow(row: ExtRow): ExtRow {
  const rate = parseFloat(row.price) || 0;
  const qty = parseFloat(row.qty) || 0;
  const dis = parseFloat(row.disc) || 0;
  const sDis = parseFloat(row.sDis) || 0;
  const gst = row.gst || 0;
  const basic = r2(rate * qty);
  const afterDis = r2(basic - (basic * dis) / 100);
  const taxable = r2(afterDis - (afterDis * sDis) / 100);
  const discAmt = r2(basic - taxable);
  const taxAmt = r2((taxable * gst) / 100);
  const netValue = r2(taxable + taxAmt);
  return { ...row, basicAmt: basic, discAmt, taxAmt, netValue };
}

function determineTaxType(sc: string, bc: string): TaxType {
  return sc === bc ? "CGST_SGST" : "IGST";
}

function normalizeText(value: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function alphaSort<T>(list: T[], getLabel: (item: T) => string) {
  return [...list].sort((a, b) =>
    normalizeText(getLabel(a)).localeCompare(normalizeText(getLabel(b))),
  );
}

function rankBySearch<T>(
  list: T[],
  getLabel: (item: T) => string,
  query: string,
) {
  const q = normalizeText(query);
  if (!q) return list;

  return [...list]
    .map((item) => {
      const label = normalizeText(getLabel(item));
      let rank = 99;

      if (label.startsWith(q)) rank = 0;
      else if (label.split(/\s+/).some((part) => part.startsWith(q))) rank = 1;
      else if (label.includes(q)) rank = 2;

      return { item, label, rank };
    })
    .filter((x) => x.rank < 99)
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.label.localeCompare(b.label);
    })
    .map((x) => x.item);
}

const sellable = (b: any) => b.currentQty > 0 && !isExpired(b.expiryDate);

// Stock that expires soonest should leave first. Batches that can't be sold go
// last and are shown disabled.
function sortBatches<T extends { currentQty: number; expiryDate?: string | null }>(
  batches: T[],
): T[] {
  const time = (b: T) =>
    parseExpiry(b.expiryDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return [...batches].sort(
    (a, b) =>
      Number(sellable(b)) - Number(sellable(a)) || time(a) - time(b),
  );
}

const fieldId = (rowId: number, field: string) => `row-${rowId}-${field}`;
const focusField = (id: string) =>
  requestAnimationFrame(() => document.getElementById(id)?.focus());

const newRow = (id: number): ExtRow => ({
  id,
  itemName: "",
  itemId: null,
  batchNo: "",
  batchId: null,
  qty: "",
  altQty: "",
  free: "",
  price: "",
  per: "Pcs",
  basicAmt: 0,
  disc: "",
  sDis: "",
  discAmt: 0,
  taxPct: "5",
  taxAmt: 0,
  netValue: 0,
  hsn: "",
  gst: 0,
  mrp: 0,
  _batches: [],
});

// ── Item Search ───────────────────────────────────────────────────────────────
function ItemSearch({
  value,
  rowId,
  rowNumber,
  allItems,
  onSelect,
  onUpdate,
  onEnter,
  customerCategory,
}: {
  value: string;
  rowId: number;
  rowNumber: number;
  allItems: Item[];
  onSelect: (rowId: number, item: Item, via: "enter" | "tab" | "mouse") => void;
  onUpdate: (rowId: number, val: string) => void;
  onEnter: () => void;
  customerCategory?: string;
}) {
  const sorted = useMemo(() => alphaSort(allItems, (i) => i.name), [allItems]);

  const filtered = useMemo(() => {
    const q = normalizeText(value);
    if (!q) return sorted;
    if (q.length === 1) {
      return sorted.filter((i) => normalizeText(i.name).startsWith(q));
    }
    return rankBySearch(sorted, (i) => i.name, value);
  }, [sorted, value]);

  function getCategoryPrice(item: Item): number | null {
    if (!customerCategory) return null;
    const cp = (item as any).categoryPrices?.find(
      (p: any) => p.category === customerCategory,
    );
    return cp ? cp.price : null;
  }

  return (
    <Combobox
      id={fieldId(rowId, "item")}
      label={`Item, row ${rowNumber}`}
      value={value}
      onInputChange={(text) => onUpdate(rowId, text)}
      onSelect={(item, via) => onSelect(rowId, item, via)}
      onEnter={onEnter}
      openOnFocus={false}
      options={filtered}
      getKey={(item) => item.id}
      emptyText="No items found"
      placeholder="Search item..."
      className="border border-transparent rounded-md bg-transparent text-sm outline-none w-full px-2 py-1.5 text-left hover:border-slate-200 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-50 transition-all"
      renderOption={(item) => {
        const catPrice = getCategoryPrice(item);
        return (
          <div className="px-3 py-2">
            <div className="text-sm font-semibold text-slate-800">
              {item.name}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-3">
              <span>HSN {(item.hsn as any)?.code || "-"}</span>
              <span>GST {(item.taxSlab as any)?.rate ?? 0}%</span>
              <span>
                Stock {fmtQty(item.batches.reduce((s, b) => s + b.currentQty, 0))}
              </span>
              {catPrice !== null && (
                <span className="text-blue-700 font-semibold">
                  Category {customerCategory} rate ₹{catPrice}
                </span>
              )}
            </div>
          </div>
        );
      }}
    />
  );
}

// ── Customer Search ───────────────────────────────────────────────────────────
function CustomerSearch({
  customers,
  value,
  onSelect,
  onPicked,
}: {
  customers: Customer[];
  value: Customer | null;
  onSelect: (c: Customer | null) => void;
  onPicked: () => void;
}) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (value) setSearch(value.name);
  }, [value]);

  const sorted = useMemo(
    () => alphaSort(customers, (c) => c.name),
    [customers],
  );

  const filtered = useMemo(() => {
    const q = normalizeText(search);
    if (!q || value?.name === search) return sorted;
    if (q.length === 1) {
      return sorted.filter((c) => normalizeText(c.name).startsWith(q));
    }
    return [...sorted]
      .map((c) => {
        const name = normalizeText(c.name);
        const gstin = normalizeText(c.gstin || "");
        let rank = 99;
        if (name.startsWith(q)) rank = 0;
        else if (name.split(/\s+/).some((part) => part.startsWith(q))) rank = 1;
        else if (name.includes(q)) rank = 2;
        else if (gstin.startsWith(q)) rank = 3;
        else if (gstin.includes(q)) rank = 4;
        return { c, name, rank };
      })
      .filter((x) => x.rank < 99)
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return a.name.localeCompare(b.name);
      })
      .map((x) => x.c);
  }, [sorted, search, value]);

  return (
    <Combobox
      id="sale-customer"
      value={search}
      onInputChange={(text) => {
        setSearch(text);
        onSelect(null);
      }}
      onSelect={(c, via) => {
        setSearch(c.name);
        onSelect(c);
        if (via !== "tab") onPicked();
      }}
      openOnFocus={false}
      options={filtered}
      getKey={(c) => c.id}
      emptyText="No customers found"
      placeholder="Search by name or GSTIN..."
      minListWidth={420}
      className="border border-slate-200 rounded-lg bg-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 placeholder:text-slate-400 transition-all w-full px-3 py-2"
      renderOption={(c) => (
        <div className="px-4 py-2.5 flex justify-between items-center gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate">
              {c.name}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 truncate">
              {[c.city, c.state].filter(Boolean).join(", ") || "No city"},{" "}
              {c.gstin || "no GSTIN"}
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-600 whitespace-nowrap num">
            ₹{Math.abs(c.balance).toLocaleString("en-IN")}{" "}
            {c.balance < 0 ? "Dr" : "Cr"}
          </span>
        </div>
      )}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SaleEntry() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [invoiceDate, setInvoiceDate] = useState(
    () => {
      const d = new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().split("T")[0];
    },
  );
  const [terms, setTerms] = useState("Credit");
  const [invoiceNo, setInvoiceNo] = useState("");

  useEffect(() => {
    const base = (
      import.meta.env.VITE_API_URL || "http://localhost:5000/api"
    ).trim();
    authFetch(`${base}/invoices/next-no`)
      .then((r) => r.json())
      .then((d) => {
        if (d.invoiceNo) setInvoiceNo(d.invoiceNo);
      })
      .catch(() => {});
  }, []);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [agentId, setAgentId] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ExtRow[]>([newRow(1)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  // State updates are async, so a fast double click would pass a state check.
  const savingRef = useRef(false);

  const taxType: TaxType = determineTaxType(
    SELLER_STATE,
    customer?.stateCode || SELLER_STATE,
  );
  const calcedRows = rows.map((r) => calcRow(r));
  const filledRows = calcedRows.filter(
    (r) => r.itemName && parseFloat(r.qty) > 0,
  );

  const totBasic = r2(filledRows.reduce((s, r) => s + r.basicAmt, 0));
  const totDisc = r2(filledRows.reduce((s, r) => s + r.discAmt, 0));
  const totTaxable = r2(totBasic - totDisc);
  const totTax = r2(filledRows.reduce((s, r) => s + r.taxAmt, 0));
  const totCgst = taxType === "CGST_SGST" ? r2(totTax / 2) : 0;
  const totSgst = taxType === "CGST_SGST" ? r2(totTax / 2) : 0;
  const totIgst = taxType === "IGST" ? totTax : 0;
  const grand = r2(totTaxable + totTax);
  const totQty = filledRows.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0);
  const totFree = filledRows.reduce((s, r) => s + (parseFloat(r.free) || 0), 0);

  const lastFilled = [...calcedRows].reverse().find((r) => r.itemName);
  const lastBatch = lastFilled?._batches.find(
    (b: any) => String(b.id) === String(lastFilled.batchId),
  );
  const lastCost = (lastBatch as any)?.purchasePrice || 0;
  const lastProfit = r2(
    lastFilled
      ? lastFilled.netValue - r2(lastCost * (parseFloat(lastFilled.qty) || 0))
      : 0,
  );

  useEffect(() => {
    Promise.all([customerApi.getAll(), itemApi.getAll(), agentApi.getAll()])
      .then(([c, i, a]) => {
        setCustomers(c);
        setAllItems(i);
        setAgents(a);
      })
      .catch(console.error);
  }, []);

  const upd = (id: number, field: string, val: string) =>
    setRows((p) =>
      p.map((r) => (r.id === id ? calcRow({ ...r, [field]: val }) : r)),
    );

  // Letters in a number field silently became 0 in the totals.
  const updNum = (id: number, field: string, val: string) => {
    if (/^\d*\.?\d*$/.test(val)) upd(id, field, val);
  };

  // Typing in a picked row means a different item is wanted, so its batch, rate
  // and tax must not carry over to whatever gets typed.
  function typeItemName(rowId: number, text: string) {
    setRows((p) =>
      p.map((r) =>
        r.id !== rowId
          ? r
          : calcRow({
              ...r,
              itemName: text,
              itemId: null,
              batchId: null,
              batchNo: "",
              hsn: "",
              gst: 0,
              taxPct: "5",
              mrp: 0,
              price: "",
              _batches: [],
            }),
      ),
    );
  }

  function selectItem(
    rowId: number,
    item: Item,
    via: "enter" | "tab" | "mouse" = "mouse",
  ) {
    if (via !== "tab") focusField(fieldId(rowId, "qty"));
    const batches = sortBatches(item.batches || []);
    const firstBatch = batches.find(sellable) || null;

    const catPrice = customer?.category
      ? (item as any).categoryPrices?.find(
          (p: any) => p.category === customer.category,
        )?.price
      : null;

    setRows((p) =>
      p.map((r) => {
        if (r.id !== rowId) return r;
        return calcRow({
          ...r,
          itemName: item.name,
          itemId: item.id,
          hsn: (item.hsn as any)?.code || "",
          gst: (item.taxSlab as any)?.rate ?? 0,
          taxPct: String((item.taxSlab as any)?.rate ?? 0),
          per: item.unit,
          _batches: batches,
          batchNo: firstBatch?.batchNo || "",
          batchId: firstBatch?.id ?? null,
          price:
            catPrice != null
              ? String(catPrice)
              : firstBatch
                ? String(firstBatch.salePrice ?? "")
                : "",
          mrp: firstBatch?.mrp ?? 0,
        });
      }),
    );
  }

  function selectBatch(rowId: number, batch: any) {
    setRows((p) =>
      p.map((r) => {
        if (r.id !== rowId) return r;

        const catPrice = customer?.category
          ? (
              allItems.find((i) => i.id === r.itemId) as any
            )?.categoryPrices?.find(
              (p: any) => p.category === customer.category,
            )?.price
          : null;

        return calcRow({
          ...r,
          batchNo: batch.batchNo || "",
          batchId: batch.id ?? null,
          price:
            catPrice != null
              ? String(catPrice)
              : String(batch.salePrice ?? ""),
          mrp: batch.mrp ?? 0,
        });
      }),
    );
  }

  const addRow = () => setRows((p) => [...p, newRow(Date.now())]);
  const delRow = (id: number) => {
    if (rows.length > 1) setRows((p) => p.filter((r) => r.id !== id));
  };

  // One sentence per row, shown under the item. Stock adds up across rows that
  // use the same batch, and free units leave the shelf too.
  const batchUse = new Map<string, number>();
  for (const r of calcedRows) {
    if (r.batchId === null) continue;
    const key = String(r.batchId);
    const used =
      (batchUse.get(key) || 0) +
      (parseFloat(r.qty) || 0) +
      (parseFloat(r.free) || 0);
    batchUse.set(key, used);
  }

  function rowProblem(r: ExtRow): { field: string; text: string } | null {
    if (!r.itemName.trim()) return null;
    if (r.itemId === null)
      return { field: "item", text: "Pick this item from the list." };
    const batch: any = r._batches.find(
      (b: any) => String(b.id) === String(r.batchId),
    );
    if (!batch) {
      return {
        field: "batch",
        text: r._batches.some(sellable)
          ? "Choose a batch."
          : "No stock to sell for this item.",
      };
    }
    if (isExpired(batch.expiryDate))
      return { field: "batch", text: "This batch has expired." };
    if (!(parseFloat(r.qty) > 0))
      return { field: "qty", text: "Enter a quantity." };
    const used = batchUse.get(String(r.batchId)) || 0;
    if (used > batch.currentQty)
      return {
        field: "qty",
        text: `Only ${fmtQty(batch.currentQty)} left in this batch, including free units.`,
      };
    return null;
  }

  function firstProblem(): { id: string; text: string } | null {
    if (!customer) return { id: "sale-customer", text: "Choose a customer." };
    for (const r of calcedRows) {
      const problem = rowProblem(r);
      if (problem)
        return {
          id: fieldId(r.id, problem.field),
          text: `${r.itemName}: ${problem.text}`,
        };
    }
    if (!filledRows.length)
      return { id: fieldId(rows[0].id, "item"), text: "Add at least one item." };
    return null;
  }

  async function handleSave(andPrint = false) {
    if (savingRef.current) return;
    const problem = firstProblem();
    if (problem || !customer) {
      if (problem) {
        setError(problem.text);
        focusField(problem.id);
      }
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const payload = {
        customerId: customer.id,
        agentId: agentId || undefined,
        invoiceDate,
        terms,
        notes,
        rows: filledRows.map((r) => ({
          itemId: r.itemId,
          batchId: r.batchId,
          itemName: r.itemName,
          hsn: r.hsn,
          mrp: r.mrp,
          rate: r.price,
          qty: r.qty,
          altQty: r.altQty,
          freeQty: r.free,
          per: r.per,
          disc: r.disc,
          sDis: r.sDis,
          gst: r.gst,
        })),
      };
      const created = await invoiceApi.create(payload);
      setSaved(true);
      // Print the number the server assigned, which can differ from the preview
      // number if someone else saved first.
      if (andPrint) handlePrint(created?.invoiceNo);
      // Leaving the form is what stops a second click billing the same sale.
      navigate("/sales");
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          "The invoice was not saved. Check your connection and try again.",
      );
      savingRef.current = false;
    } finally {
      setSaving(false);
    }
  }

  function handlePrint(finalInvoiceNo?: string) {
    const data = {
      customer,
      rows: calcedRows,
      invoiceNo: finalInvoiceNo || invoiceNo,
      invoiceDate,
      terms,
      notes,
      taxType,
      totDisc,
      totTaxable,
      totCgst,
      totSgst,
      totIgst,
      totTax,
      grand,
    };
    localStorage.setItem("erp_print_data", JSON.stringify(data));
    window.open("/invoice-print.html", "_blank");
  }

  const inp =
    "border border-slate-200 rounded-lg bg-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 placeholder:text-slate-300 transition-all";
  const ti =
    "border border-transparent rounded-md bg-transparent text-xs outline-none w-full px-1.5 py-1 text-right hover:border-slate-200 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-50 transition-all";

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/sales")}
            aria-label="Back to all invoices"
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors text-lg"
          >
            ←
          </button>
          <div>
            <div className="font-bold text-slate-800 text-[15px] leading-tight">
              Create Invoice
            </div>
            <div className="text-xs text-slate-400">
              {COMPANY.name}, Tasgaon
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-1.5 ml-1 flex items-center gap-1">
            <span className="text-sm font-bold text-blue-700">{invoiceNo}</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-1.5 rounded-lg font-medium">
              {error}
            </div>
          )}
          {saved && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-1.5 rounded-lg font-medium">
              ✓ Saved
            </div>
          )}
          <button
            onClick={() => handlePrint()}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
          >
            Preview & Print
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium disabled:opacity-50"
          >
            Save & Print
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
          >
            {saving && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Save →
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700 text-sm">
              Invoice Details
            </h2>
          </div>
          <div className="px-5 py-4 grid grid-cols-4 gap-4">
            <div className="col-span-2">
              <label
                htmlFor="sale-customer"
                className="text-xs font-semibold text-slate-500 block mb-1.5"
              >
                Customer *
              </label>
              <CustomerSearch
                customers={customers}
                value={customer}
                onSelect={(c) => setCustomer(c)}
                onPicked={() => focusField(fieldId(rows[0].id, "item"))}
              />
              {customer && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      customer.balance < 0
                        ? "bg-red-50 text-red-600"
                        : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    Bal: ₹{Math.abs(customer.balance).toLocaleString("en-IN")}{" "}
                    {customer.balance < 0 ? "Dr." : "Cr."}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
                    {taxType === "CGST_SGST" ? "CGST + SGST" : "IGST"}
                  </span>
                  {customer.gstin ? (
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                      ✓ {customer.gstin}
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-600">
                      B2C, No GSTIN
                    </span>
                  )}
                  {customer.category && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">
                      Category: {customer.category}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className={`${inp} w-full px-3 py-2.5`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">
                Terms
              </label>
              <select
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className={`${inp} w-full px-3 py-2.5 cursor-pointer`}
              >
                <option>Credit</option>
                <option>Cash</option>
                <option>Advance</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">
                Agent Name
              </label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className={`${inp} w-full px-3 py-2.5 cursor-pointer`}
              >
                <option value="">-- Select Agent --</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <div className="text-xs font-semibold text-slate-500 mb-1.5">
                Customer GSTIN
              </div>
              <div className="px-3 py-2.5 text-sm text-slate-500">
                {customer ? customer.gstin || "No GSTIN" : "Fills in from the customer"}
              </div>
            </div>
          </div>
          {lastFilled && (
            <div className="mx-5 mb-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-5 text-xs flex-wrap">
              <span className="text-slate-400">Last item:</span>
              <span className="font-semibold text-slate-700">
                {lastFilled.itemName}
              </span>
              <span className="text-slate-400">
                Cost: <b className="text-slate-600">₹{fmt(lastCost)}</b>
              </span>
              <span className="text-slate-400">
                Value:{" "}
                <b className="text-slate-600">₹{fmt(lastFilled.netValue)}</b>
              </span>
              <span className="text-slate-400">
                Profit:{" "}
                <b
                  className={
                    lastProfit >= 0 ? "text-emerald-600" : "text-red-500"
                  }
                >
                  ₹{fmt(lastProfit)}
                </b>
              </span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 text-sm">
              Products & Items
            </h2>
            <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
              {filledRows.length} item(s)
            </span>
          </div>
          <div
            className="overflow-x-auto"
            style={{ overflowX: "auto", overflowY: "visible" }}
          >
            <table className="w-full" style={{ minWidth: 1280 }}>
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  {(
                    [
                      ["#", 36, "center"],
                      ["Item Name", 200, "left"],
                      ["HSN", 80, "center"],
                      ["Batch", 120, "center"],
                      ["Exp", 72, "center"],
                      ["MRP", 72, "right"],
                      ["Rate", 80, "right"],
                      ["Qty", 64, "right"],
                      ["Free", 56, "right"],
                      ["Dis %", 64, "right"],
                      ["S Dis %", 68, "right"],
                      ["GST %", 60, "right"],
                      ["Taxable", 90, "right"],
                      ["Total", 90, "right"],
                      ["", 36, "center"],
                    ] as [string, number, string][]
                  ).map(([label, w, align]) => (
                    <th
                      key={label}
                      style={{ width: w, minWidth: w }}
                      className={`px-2 py-2.5 text-xs font-semibold text-slate-500 text-${align} whitespace-nowrap select-none`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const calc = calcedRows[idx];
                  const masterItem = allItems.find((i) => i.id === row.itemId);
                  const bList: any[] =
                    row._batches.length > 0
                      ? row._batches
                      : masterItem?.batches || [];
                  const currBatch = bList.find(
                    (b: any) => String(b.id) === String(row.batchId),
                  );
                  const problem = rowProblem(calc);

                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-50 transition-colors ${
                        idx % 2 === 0
                          ? "bg-white hover:bg-slate-50/40"
                          : "bg-slate-50/20 hover:bg-slate-50/60"
                      }`}
                    >
                      <td className="px-2 py-2 text-center text-xs text-slate-300 font-semibold">
                        {idx + 1}
                      </td>
                      <td className="px-2 py-1.5">
                        <ItemSearch
                          value={row.itemName}
                          rowId={row.id}
                          allItems={allItems}
                          onSelect={selectItem}
                          onUpdate={typeItemName}
                          rowNumber={idx + 1}
                          onEnter={() => focusField("sale-notes")}
                          customerCategory={customer?.category || undefined}
                        />
                        {problem && (
                          <div className="px-2 pt-0.5 text-xs text-red-600">
                            {problem.text}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
<div className="text-xs text-slate-500 text-center">
                          {row.hsn}
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={
                            row.batchId !== null ? String(row.batchId) : ""
                          }
                          onChange={(e) => {
                            const b = bList.find(
                              (x: any) => String(x.id) === e.target.value,
                            );
                            if (b) selectBatch(row.id, b);
                          }}
                          id={fieldId(row.id, "batch")}
                          aria-label={`Batch, row ${idx + 1}`}
                          className="border border-slate-200 rounded-md text-xs bg-white outline-none focus:border-blue-400 w-full px-1.5 py-1 cursor-pointer"
                        >
                          <option value="">-- Batch --</option>
                          {bList.map((b: any) => (
                            <option
                              key={b.id}
                              value={String(b.id)}
                              disabled={!sellable(b)}
                            >
                              {b.batchNo}, {fmtExpiry(b.expiryDate)},{" "}
                              {isExpired(b.expiryDate)
                                ? "expired"
                                : b.currentQty > 0
                                  ? `${fmtQty(b.currentQty)} left`
                                  : "none left"}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
<div className="text-xs text-slate-500 text-center whitespace-nowrap">
                          {currBatch ? fmtExpiry(currBatch.expiryDate) : ""}
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
<div className="num text-xs text-slate-500 px-1.5">
                          {row.mrp ? fmt(row.mrp) : ""}
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          id={fieldId(row.id, "price")}
                          aria-label={`Rate, row ${idx + 1}`}
                          inputMode="decimal"
                          value={row.price}
                          onChange={(e) => updNum(row.id, "price", e.target.value)}
                          className={`${ti} num`}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          id={fieldId(row.id, "qty")}
                          aria-label={`Qty, row ${idx + 1}`}
                          inputMode="decimal"
                          value={row.qty}
                          onChange={(e) => updNum(row.id, "qty", e.target.value)}
                          className={`${ti} num`}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          id={fieldId(row.id, "free")}
                          aria-label={`Free, row ${idx + 1}`}
                          inputMode="decimal"
                          value={row.free}
                          onChange={(e) => updNum(row.id, "free", e.target.value)}
                          className={`${ti} num`}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          id={fieldId(row.id, "disc")}
                          aria-label={`Discount percent, row ${idx + 1}`}
                          inputMode="decimal"
                          value={row.disc}
                          onChange={(e) => updNum(row.id, "disc", e.target.value)}
                          className={`${ti} num`}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          id={fieldId(row.id, "sDis")}
                          aria-label={`Special discount percent, row ${idx + 1}`}
                          inputMode="decimal"
                          value={row.sDis}
                          onChange={(e) => updNum(row.id, "sDis", e.target.value)}
                          className={`${ti} num`}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
<div className="num text-xs text-slate-500 px-1.5">
                          {row.gst || ""}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-medium text-slate-500">
                        {calc.netValue > 0 ? (
                          `₹${fmt(r2(calc.basicAmt - calc.discAmt))}`
                        ) : (
                          <span className="text-slate-200">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {calc.netValue > 0 ? (
                          <span className="text-sm font-bold text-slate-800">
                            ₹{fmt(calc.netValue)}
                          </span>
                        ) : (
                          <span className="text-slate-200 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => delRow(row.id)}
                          aria-label={`Remove row ${idx + 1}`}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors mx-auto text-lg leading-none"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100">
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium border border-dashed border-blue-200 rounded-xl px-4 py-2 hover:bg-blue-50/50 hover:border-blue-300 transition-all"
            >
              <span className="text-lg leading-none">+</span> Add Item
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-700 text-sm mb-3">
              Notes (Optional)
            </h2>
            <textarea
              id="sale-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              aria-label="Notes"
              placeholder="Add notes or special instructions..."
              className={`${inp} w-full px-3 py-2.5 resize-none h-24`}
            />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-700 text-sm mb-4">
              Invoice Summary
            </h2>
            <div className="space-y-2.5 text-sm">
              {(
                [
                  ["Total Discount", `₹${fmt(totDisc)}`],
                  ["Taxable Amount", `₹${fmt(totTaxable)}`],
                  ...(taxType === "CGST_SGST"
                    ? [
                        ["CGST", `₹${fmt(totCgst)}`],
                        ["SGST", `₹${fmt(totSgst)}`],
                      ]
                    : [["IGST", `₹${fmt(totIgst)}`]]),
                  ["Total Tax", `₹${fmt(totTax)}`],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-700">{value}</span>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                <span className="font-bold text-slate-800 text-base">
                  Grand Total
                </span>
                <span className="font-bold text-blue-600 text-2xl">
                  ₹{fmt(grand)}
                </span>
              </div>
            </div>
            <button
              onClick={() => handlePrint()}
              className="mt-4 w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm active:scale-95"
            >
              Preview & Print →
            </button>
          </div>
        </div>
        <div className="h-16" />
      </div>

      <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center sticky bottom-0 z-40 shadow-2xl">
        {(
          [
            ["Items", String(filledRows.length)],
            ["Qty", fmtInt(totQty)],
            ["Free", fmtInt(totFree)],
            ["Basic", `₹${fmt(totBasic)}`],
            ["Discount", `₹${fmt(totDisc)}`],
            ["Taxable", `₹${fmt(totTaxable)}`],
            ["Tax", `₹${fmt(totTax)}`],
            ["Net Bill", `₹${fmt(grand)}`],
          ] as [string, string][]
        ).map(([label, value], i, arr) => (
          <div
            key={label}
            className={`flex-1 text-center px-2 ${
              i < arr.length - 1 ? "border-r border-slate-700" : ""
            }`}
          >
            <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide leading-tight">
              {label}
            </div>
            <div
              className={`text-sm font-bold leading-tight mt-0.5 ${
                i === arr.length - 1 ? "text-blue-400" : "text-white"
              }`}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
