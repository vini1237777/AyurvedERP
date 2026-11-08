import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  customerApi,
  itemApi,
  agentApi,
  invoiceApi,
  authFetch,
} from "../../utils/api";
import { expiresSoon,
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
// Move at once when the field exists, so fast typing can't land in the old field.
// A row that was just added only exists after the next render.
const focusField = (id: string) => {
  const el = document.getElementById(id);
  if (el) el.focus();
  else requestAnimationFrame(() => document.getElementById(id)?.focus());
};

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
      className="border border-slate-200 rounded-lg bg-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 placeholder:text-slate-400 transition-all w-full py-1.5"
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
      // Print the number the server assigned, which can differ from the preview
      // number if someone else saved first.
      if (andPrint) handlePrint(created?.invoiceNo);
      // Leaving the form is what stops a second click billing the same sale.
      navigate("/sales", {
        replace: true,
        state: { savedInvoiceNo: created?.invoiceNo },
      });
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

  // Enter walks forward through the grid. Tab keeps its normal behaviour.
  function goToNextRow(rowId: number) {
    const idx = rows.findIndex((r) => r.id === rowId);
    const next = rows[idx + 1];
    if (next) {
      focusField(fieldId(next.id, "item"));
      return;
    }
    const id = Date.now();
    setRows((p) => [...p, newRow(id)]);
    focusField(fieldId(id, "item"));
  }

  const enterGoes =
    (go: () => void) => (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      go();
    };

  // Always call the latest handleSave without re-binding the listener.
  const saveRef = useRef(handleSave);
  saveRef.current = handleSave;

  useEffect(() => {
    focusField("sale-customer");
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key !== "s" && key !== "p") return;
      e.preventDefault();
      if (!e.repeat) saveRef.current(key === "p");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const inp =
    "text-sm outline-none placeholder:text-slate-400";
  const ti =
    "text-sm outline-none w-full py-1 text-right";

  return (
    <div className="ledger-sheet h-screen flex flex-col overflow-hidden">
      {/* The form comes first in the page so Tab reaches Save after the fields,
          and order-first keeps the actions visually at the top. */}
      <main className="order-2 flex-1 min-h-0 overflow-auto pl-7 pr-6 py-2 flex flex-col gap-2">
        <section
          aria-label="Invoice details"
          className=""
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5">
              <label
                htmlFor="sale-customer"
                className="text-xs font-medium text-slate-500 block"
              >
                Customer *
              </label>
              <CustomerSearch
                customers={customers}
                value={customer}
                onSelect={(c) => setCustomer(c)}
                onPicked={() => focusField(fieldId(rows[0].id, "item"))}
              />
            </div>
            <div className="md:col-span-2">
              <label
                htmlFor="sale-date"
                className="text-xs font-medium text-slate-500 block"
              >
                Invoice date
              </label>
              <input
                id="sale-date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className={`${inp} w-full py-1.5`}
              />
            </div>
            <div className="md:col-span-2">
              <label
                htmlFor="sale-terms"
                className="text-xs font-medium text-slate-500 block"
              >
                Terms
              </label>
              <select
                id="sale-terms"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className={`${inp} w-full py-1.5 cursor-pointer`}
              >
                <option>Credit</option>
                <option>Cash</option>
                <option>Advance</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label
                htmlFor="sale-agent"
                className="text-xs font-medium text-slate-500 block"
              >
                Agent
              </label>
              <select
                id="sale-agent"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className={`${inp} w-full py-1.5 cursor-pointer`}
              >
                <option value="">No agent</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* Always one line tall, so choosing a customer doesn't move the grid. */}
          <div className="mt-2 min-h-[20px] flex flex-wrap items-center gap-x-5 text-xs text-slate-600">
            {customer ? (
              <>
                <span>
                  Balance{" "}
                  <b
                    className={
                      customer.balance < 0 ? "text-red-600" : "text-slate-800"
                    }
                  >
                    ₹{Math.abs(customer.balance).toLocaleString("en-IN")}{" "}
                    {customer.balance < 0 ? "Dr" : "Cr"}
                  </b>
                </span>
                <span>
                  Tax{" "}
                  <b className="text-slate-800">
                    {taxType === "CGST_SGST" ? "CGST and SGST" : "IGST"}
                  </b>
                </span>
                <span>
                  GSTIN{" "}
                  <b className="text-slate-800 font-mono">
                    {customer.gstin || "None, billed as B2C"}
                  </b>
                </span>
                {customer.category && (
                  <span>
                    Rate category{" "}
                    <b className="text-slate-800">{customer.category}</b>
                  </span>
                )}
              </>
            ) : (
              <span className="text-slate-500">
                Balance, tax type and GSTIN show here once you choose a customer.
              </span>
            )}
          </div>
        </section>

        <section
          aria-label="Items"
          className="flex-1 min-h-[260px] flex flex-col overflow-hidden"
        >
          <div className="ledger-rules flex-1 min-h-0 overflow-auto">
            <table className="w-full bg-paper" style={{ minWidth: 1190 }}>
              <thead className="sticky top-0 z-10">
                <tr>
                  {(
                    [
                      ["#", 36, "text-center"],
                      ["Item", 220, "text-left"],
                      ["HSN", 76, "text-center"],
                      ["Batch", 204, "text-left"],
                      ["Expiry", 76, "text-center"],
                      ["MRP", 72, "text-right"],
                      ["Rate", 80, "text-right"],
                      ["Qty", 64, "text-right"],
                      ["Free", 56, "text-right"],
                      ["Dis %", 60, "text-right"],
                      ["S Dis %", 64, "text-right"],
                      ["GST %", 56, "text-right"],
                      ["Taxable", 90, "text-right"],
                      ["Total", 96, "text-right"],
                      ["", 36, "text-center"],
                    ] as [string, number, string][]
                  ).map(([label, w, align]) => (
                    <th
                      key={label}
                      scope="col"
                      style={{ width: w, minWidth: w }}
                      className={`px-2 py-2 text-xs font-semibold text-slate-600 ${align} whitespace-nowrap select-none`}
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
                      className="focus-within:bg-[#FBFDF7]"
                    >
                      <td className="px-2 py-2 text-center text-xs text-slate-500 font-semibold">
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
                          onKeyDown={enterGoes(() =>
                            focusField(fieldId(row.id, "qty")),
                          )}
                          aria-label={`Batch, row ${idx + 1}`}
                          className="text-xs outline-none w-full py-1 cursor-pointer"
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
<div className="text-xs text-center whitespace-nowrap">
                          {currBatch && expiresSoon(currBatch.expiryDate) ? (
                            <span
                              className="pen-ring"
                              title="Expires within 90 days. Sell this one first."
                            >
                              {fmtExpiry(currBatch.expiryDate)}
                            </span>
                          ) : currBatch ? (
                            fmtExpiry(currBatch.expiryDate)
                          ) : (
                            ""
                          )}
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
                          onKeyDown={enterGoes(() =>
                            focusField(fieldId(row.id, "qty")),
                          )}
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
                          onKeyDown={enterGoes(() =>
                            focusField(fieldId(row.id, "free")),
                          )}
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
                          onKeyDown={enterGoes(() =>
                            focusField(fieldId(row.id, "disc")),
                          )}
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
                          onKeyDown={enterGoes(() =>
                            focusField(fieldId(row.id, "sDis")),
                          )}
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
                          onKeyDown={enterGoes(() => goToNextRow(row.id))}
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
                      <td className="px-2 py-2 num text-xs font-medium text-slate-600">
                        {calc.netValue > 0 ? (
                          `₹${fmt(r2(calc.basicAmt - calc.discAmt))}`
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-2 py-2 num">
                        {calc.netValue > 0 ? (
                          <span className="text-sm font-bold text-slate-800">
                            ₹{fmt(calc.netValue)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => delRow(row.id)}
                          aria-label={`Remove row ${idx + 1}`}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors mx-auto text-lg leading-none"
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
          <div className="py-2">
            <div className="flex items-center gap-3">
              <button
                onClick={addRow}
                className="whitespace-nowrap flex items-center gap-1.5 text-sm text-ink font-semibold border-[1.5px] border-ink px-3 py-1 hover:bg-slate-50"
              >
                <span className="text-lg leading-none">+</span> Add item
              </button>
              <label htmlFor="sale-notes" className="sr-only">
                Notes
              </label>
              <input
                id="sale-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes, printed on the invoice (optional)"
                className={`${inp} flex-1 min-w-0 py-1.5`}
              />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-5 text-xs text-slate-500">
              <span>
                Enter moves to the next field. Ctrl+S saves. Ctrl+P saves and
                prints.
              </span>
              {lastFilled && (
                <span>
                  {lastFilled.itemName}: cost{" "}
                  <b className="text-slate-700">₹{fmt(lastCost)}</b>, value{" "}
                  <b className="text-slate-700">₹{fmt(lastFilled.netValue)}</b>,
                  profit{" "}
                  <b
                    className={
                      lastProfit >= 0 ? "text-slate-700" : "text-red-600"
                    }
                  >
                    ₹{fmt(lastProfit)}
                  </b>
                </span>
              )}
            </div>
          </div>
        </section>
      </main>

      <header className="order-1 border-b border-rule pl-7 pr-6 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => navigate("/sales")}
            aria-label="Back to all invoices"
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors text-lg"
          >
            ←
          </button>
          <div className="min-w-0">
            <h1 className="font-bold text-ink text-[22px] leading-tight">
              Create invoice
            </h1>
            <div className="text-xs text-slate-500 truncate">
              {COMPANY.name}, Tasgaon
            </div>
          </div>
          <p
            title="The final number is set when you save"
            className="text-[22px] font-bold text-ink whitespace-nowrap"
          >
            {invoiceNo}
          </p>
        </div>
        {error && (
          <div
            role="alert"
            className="text-red-700 text-sm font-medium"
          >
            {error}
          </div>
        )}
        <p
          lang="hi"
          className="hidden xl:flex gap-8 font-deva font-semibold text-lg text-pen"
        >
          <span>शुभ</span>
          <span>लाभ</span>
        </p>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handlePrint()}
            className="px-4 py-2 text-sm border-[1.5px] border-ink text-ink hover:bg-slate-50 font-semibold whitespace-nowrap"
          >
            Preview
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            title="Ctrl+P"
            className="px-4 py-2 text-sm border-[1.5px] border-ink text-ink hover:bg-slate-50 font-semibold disabled:opacity-50 whitespace-nowrap"
          >
            Save & Print
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            title="Ctrl+S"
            className="px-5 py-2 text-sm bg-ink border-[1.5px] border-ink text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Save
          </button>
        </div>
      </header>

      <div
        aria-label="Invoice totals"
        role="group"
        className="order-3 border-t-[1.5px] border-ink pl-7 pr-6 py-1.5 flex items-end overflow-x-auto"
      >
        {(
          [
            ["Items", String(filledRows.length)],
            ["Qty", fmtInt(totQty)],
            ["Free", fmtInt(totFree)],
            ["Basic", `₹${fmt(totBasic)}`],
            ["Discount", `₹${fmt(totDisc)}`],
            ["Taxable", `₹${fmt(totTaxable)}`],
            ...(taxType === "CGST_SGST"
              ? [
                  ["CGST", `₹${fmt(totCgst)}`],
                  ["SGST", `₹${fmt(totSgst)}`],
                ]
              : [["IGST", `₹${fmt(totIgst)}`]]),
            ["Net bill", `₹${fmt(grand)}`],
          ] as [string, string][]
        ).map(([label, value], i, arr) => {
          const net = i === arr.length - 1;
          return (
            <div
              key={label}
              className={`whitespace-nowrap ${
                net
                  ? "ledger-total ml-auto pl-6 text-right"
                  : "flex-1 pr-3"
              }`}
            >
              <div className="text-xs text-slate-500 leading-tight">{label}</div>
              <div
                aria-live={net ? "polite" : undefined}
                className={`font-semibold leading-tight [font-variant-numeric:tabular-nums] ${
                  net ? "text-[28px] font-bold text-ink" : "text-base text-ink"
                }`}
              >
                {value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
