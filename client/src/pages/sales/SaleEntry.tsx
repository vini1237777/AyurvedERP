import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { customerApi, itemApi, agentApi, invoiceApi } from "../../utils/api";
import { fmt, fmtInt, COMPANY, SELLER_STATE } from "../../utils/invoice.utils";
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

// ── Item Search Dropdown — uses fixed positioning to escape overflow clip ──
function ItemSearch({
  value,
  rowId,
  allItems,
  onSelect,
  onUpdate,
}: {
  value: string;
  rowId: number;
  allItems: Item[];
  onSelect: (rowId: number, item: Item) => void;
  onUpdate: (rowId: number, val: string) => void;
}) {
  const [show, setShow] = useState(false);
  const [search, setSearch] = useState(value);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  // Recalculate position — called on focus, change, and scroll
  function updatePos() {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 300) });
  }

  // Listen to scroll on the overflow-auto content container so dropdown tracks input
  useEffect(() => {
    if (!show) return;
    const scroller = inputRef.current?.closest(
      ".overflow-auto",
    ) as HTMLElement | null;
    const onScroll = () => updatePos();
    scroller?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
    };
  }, [show]);

  const filtered = allItems.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <input
        ref={inputRef}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          onUpdate(rowId, e.target.value);
          updatePos();
          setShow(true);
        }}
        onFocus={() => {
          updatePos();
          setShow(true);
        }}
        onBlur={() => setTimeout(() => setShow(false), 200)}
        placeholder="Search item..."
        className="border border-transparent rounded-md bg-transparent text-xs outline-none w-full px-2 py-1.5 text-left hover:border-slate-200 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-50 transition-all"
      />
      {show &&
        pos.top > 0 &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: 240,
              zIndex: 99999,
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
              overflowY: "auto",
            }}
          >
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: "16px",
                  textAlign: "center",
                  fontSize: "12px",
                  color: "#94a3b8",
                }}
              >
                {search ? "No items found" : "Type to search..."}
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSearch(item.name);
                    setShow(false);
                    onSelect(rowId, item);
                  }}
                  className="px-3 py-2.5 cursor-pointer hover:bg-blue-50 border-b border-slate-50 last:border-0"
                >
                  <div className="text-sm font-semibold text-slate-800">
                    {item.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 flex gap-3">
                    <span>HSN: {(item.hsn as any)?.code || "-"}</span>
                    <span>GST: {(item.taxSlab as any)?.rate ?? 0}%</span>
                    <span>
                      Stk: {item.batches.reduce((s, b) => s + b.currentQty, 0)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SaleEntry() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  const [invoiceDate, setInvoiceDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [terms, setTerms] = useState("Credit");
  const [invoiceNo, setInvoiceNo] = useState("FA-01");

  // Load next invoice number on mount
  useEffect(() => {
    const base = (
      import.meta.env.VITE_API_URL || "http://localhost:5000/api"
    ).trim();
    fetch(`${base}/invoices/next-no`)
      .then((r) => r.json())
      .then((d) => {
        if (d.invoiceNo) setInvoiceNo(d.invoiceNo);
      })
      .catch(() => {});
  }, []);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [partySearch, setPartySearch] = useState("");
  const [showParty, setShowParty] = useState(false);
  const partyRef = useRef<HTMLDivElement>(null);

  const [agentId, setAgentId] = useState("");
  const [rows, setRows] = useState<ExtRow[]>([newRow(1)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

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

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (partyRef.current && !partyRef.current.contains(e.target as Node))
        setShowParty(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const upd = (id: number, field: string, val: string) =>
    setRows((p) =>
      p.map((r) => (r.id === id ? calcRow({ ...r, [field]: val }) : r)),
    );

  function selectItem(rowId: number, item: Item) {
    const batches = item.batches || [];
    const firstBatch = batches[0] || null;
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
          price: firstBatch ? String(firstBatch.salePrice ?? "") : "",
          mrp: firstBatch?.mrp ?? 0,
        });
      }),
    );
  }

  function selectBatch(rowId: number, batch: any) {
    setRows((p) =>
      p.map((r) => {
        if (r.id !== rowId) return r;
        return calcRow({
          ...r,
          batchNo: batch.batchNo || "",
          batchId: batch.id ?? null,
          price: String(batch.salePrice ?? ""),
          mrp: batch.mrp ?? 0,
        });
      }),
    );
  }

  const addRow = () => setRows((p) => [...p, newRow(Date.now())]);
  const delRow = (id: number) => {
    if (rows.length > 1) setRows((p) => p.filter((r) => r.id !== id));
  };

  async function handleSave(andPrint = false) {
    if (!customer) {
      setError("Please select a customer");
      return;
    }
    if (!filledRows.length) {
      setError("Add at least one item");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        customerId: customer.id,
        agentId: agentId || undefined,
        invoiceDate,
        terms,
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
      await invoiceApi.create(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      if (andPrint) handlePrint();
      else navigate("/sales");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    const data = {
      customer,
      rows: calcedRows,
      invoiceNo,
      invoiceDate,
      terms,
      taxType,
      totDisc,
      totTaxable,
      totCgst,
      totSgst,
      totIgst,
      totTax,
      grand,
    };
    localStorage.setItem("fulanand_print_data", JSON.stringify(data));
    window.open("/invoice-print.html", "_blank");
  }

  const inp =
    "border border-slate-200 rounded-lg bg-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 placeholder:text-slate-300 transition-all";
  const lock =
    "border border-slate-100 rounded-lg bg-slate-50 text-sm text-slate-400 cursor-not-allowed";
  const ti =
    "border border-transparent rounded-md bg-transparent text-xs outline-none w-full px-1.5 py-1 text-right hover:border-slate-200 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-50 transition-all";

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      {/* TOP BAR */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/sales")}
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
            onClick={handlePrint}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
          >
            Preview & Print
          </button>
          <button
            onClick={() => handleSave(true)}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
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

      {/* CONTENT */}
      <div className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-4">
        {/* INVOICE DETAILS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700 text-sm">
              Invoice Details
            </h2>
          </div>
          <div className="px-5 py-4 grid grid-cols-4 gap-4">
            {/* Customer */}
            <div className="col-span-2 relative" ref={partyRef}>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">
                Customer *
              </label>
              <input
                value={customer ? customer.name : partySearch}
                onChange={(e) => {
                  setPartySearch(e.target.value);
                  setCustomer(null);
                  setShowParty(true);
                }}
                onFocus={() => setShowParty(true)}
                placeholder="Search by name or GSTIN..."
                className={`${inp} w-full px-3 py-2.5`}
              />
              {showParty && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto">
                  {customers
                    .filter(
                      (c) =>
                        c.name
                          .toLowerCase()
                          .includes(partySearch.toLowerCase()) ||
                        (c.gstin || "").includes(partySearch),
                    )
                    .map((c) => (
                      <div
                        key={c.id}
                        onMouseDown={() => {
                          setCustomer(c);
                          setPartySearch("");
                          setShowParty(false);
                        }}
                        className="px-4 py-3 cursor-pointer hover:bg-blue-50 border-b border-slate-50 last:border-0 flex justify-between items-center"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-800">
                            {c.name}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {c.gstin || "B2C — No GSTIN"} · {c.state}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-lg ${c.balance < 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}
                        >
                          ₹{Math.abs(c.balance).toLocaleString("en-IN")}{" "}
                          {c.balance < 0 ? "Dr." : "Cr."}
                        </span>
                      </div>
                    ))}
                  {!customers.filter((c) =>
                    c.name.toLowerCase().includes(partySearch.toLowerCase()),
                  ).length && (
                    <div className="px-4 py-4 text-xs text-slate-400 text-center">
                      No customers found
                    </div>
                  )}
                </div>
              )}
              {customer && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${customer.balance < 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}
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
                      B2C — No GSTIN
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
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">
                Customer GSTIN
              </label>
              <input
                value={customer?.gstin || ""}
                readOnly
                placeholder="Auto-filled from customer"
                className={`${lock} w-full px-3 py-2.5`}
              />
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

        {/* PRODUCTS TABLE */}
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

                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-50 transition-colors ${idx % 2 === 0 ? "bg-white hover:bg-slate-50/40" : "bg-slate-50/20 hover:bg-slate-50/60"}`}
                    >
                      <td className="px-2 py-2 text-center text-xs text-slate-300 font-semibold">
                        {idx + 1}
                      </td>

                      {/* ── Item Search (dedicated component) ── */}
                      <td className="px-2 py-1.5">
                        <ItemSearch
                          value={row.itemName}
                          rowId={row.id}
                          allItems={allItems}
                          onSelect={selectItem}
                          onUpdate={(rowId, val) => upd(rowId, "itemName", val)}
                        />
                      </td>

                      <td className="px-2 py-1.5">
                        <input
                          value={row.hsn}
                          readOnly
                          className={`${ti} bg-slate-50/80 text-slate-400 text-center cursor-not-allowed border-transparent`}
                        />
                      </td>

                      {/* Batch dropdown */}
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
                          className="border border-slate-200 rounded-md text-xs bg-white outline-none focus:border-blue-400 w-full px-1.5 py-1 cursor-pointer hover:border-slate-300 transition-colors"
                        >
                          <option value="">-- Batch --</option>
                          {bList.map((b: any) => (
                            <option key={b.id} value={String(b.id)}>
                              {b.batchNo} (Stk:{b.currentQty})
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-2 py-1.5">
                        <input
                          value={currBatch?.expiryDate || ""}
                          readOnly
                          className={`${ti} bg-slate-50/80 text-slate-400 text-center cursor-not-allowed border-transparent`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={row.mrp ? fmt(row.mrp) : ""}
                          readOnly
                          className={`${ti} bg-slate-50/80 text-slate-400 cursor-not-allowed border-transparent`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={row.price}
                          onChange={(e) => upd(row.id, "price", e.target.value)}
                          className={ti}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={row.qty}
                          onChange={(e) => upd(row.id, "qty", e.target.value)}
                          className={ti}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={row.free}
                          onChange={(e) => upd(row.id, "free", e.target.value)}
                          className={ti}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={row.disc}
                          onChange={(e) => upd(row.id, "disc", e.target.value)}
                          className={ti}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={row.sDis}
                          onChange={(e) => upd(row.id, "sDis", e.target.value)}
                          className={ti}
                          placeholder="0"
                        />
                      </td>

                      <td className="px-2 py-1.5">
                        <input
                          value={row.gst || ""}
                          readOnly
                          className={`${ti} bg-slate-50/80 text-slate-400 text-center cursor-not-allowed border-transparent`}
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-medium text-slate-500">
                        {calc.netValue > 0 ? (
                          `₹${fmt(r2(calc.basicAmt - calc.discAmt))}`
                        ) : (
                          <span className="text-slate-200">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {calc.netValue > 0 ? (
                          <span className="text-sm font-bold text-slate-800">
                            ₹{fmt(calc.netValue)}
                          </span>
                        ) : (
                          <span className="text-slate-200 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => delRow(row.id)}
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

        {/* SUMMARY */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-700 text-sm mb-3">
              Notes (Optional)
            </h2>
            <textarea
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
              onClick={handlePrint}
              className="mt-4 w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm active:scale-95"
            >
              Preview & Print →
            </button>
          </div>
        </div>
        <div className="h-16" />
      </div>

      {/* STICKY BOTTOM BAR */}
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
            className={`flex-1 text-center px-2 ${i < arr.length - 1 ? "border-r border-slate-700" : ""}`}
          >
            <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide leading-tight">
              {label}
            </div>
            <div
              className={`text-sm font-bold leading-tight mt-0.5 ${i === arr.length - 1 ? "text-blue-400" : "text-white"}`}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
