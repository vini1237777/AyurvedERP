import { refreshStockLists } from "../../utils/queryClient";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fmt } from "../../utils/invoice.utils";
import { Combobox } from "../../components/ui";
import type { Customer, Item } from "../../types";
import { customerApi, itemApi, authFetch, API_BASE_URL } from "../../utils/api";

const r2 = (v: number) => Math.round(v * 100) / 100;
const API = API_BASE_URL;

type PRow = {
  id: number;
  itemName: string;
  itemId: number | null;
  batchId: number | null;
  batchNo: string;
  qty: string;
  freeQty: string;
  rate: string;
  mrp: string;
  disc: string;
  gst: number;
  hsn: string;
  per: string;
  _batches: any[];
  basic: number;
  discAmt: number;
  taxable: number;
  taxAmt: number;
  netValue: number;
};

function calcRow(r: PRow): PRow {
  const rate = parseFloat(r.rate) || 0,
    qty = parseFloat(r.qty) || 0,
    disc = parseFloat(r.disc) || 0,
    gst = r.gst || 0;
  const basic = r2(rate * qty),
    taxable = r2(basic - (basic * disc) / 100),
    discAmt = r2(basic - taxable);
  const taxAmt = r2((taxable * gst) / 100);
  return {
    ...r,
    basic,
    discAmt,
    taxable,
    taxAmt,
    netValue: r2(taxable + taxAmt),
  };
}

function newRow(id: number): PRow {
  return {
    id,
    itemName: "",
    itemId: null,
    batchId: null,
    batchNo: "",
    qty: "",
    freeQty: "",
    rate: "",
    mrp: "",
    disc: "",
    gst: 0,
    hsn: "",
    per: "Pcs",
    _batches: [],
    basic: 0,
    discAmt: 0,
    taxable: 0,
    taxAmt: 0,
    netValue: 0,
  };
}

function ItemSearch({
  value,
  rowId,
  rowNumber,
  allItems,
  onSelect,
  onUpdate,
}: {
  value: string;
  rowId: number;
  rowNumber: number;
  allItems: Item[];
  onSelect: (id: number, item: Item, via: "enter" | "tab" | "mouse") => void;
  onUpdate: (id: number, v: string) => void;
}) {
  const sorted = useMemo(
    () => [...allItems].sort((a, b) => a.name.localeCompare(b.name)),
    [allItems],
  );
  const filtered = useMemo(
    () =>
      value.trim()
        ? sorted.filter((i) =>
            i.name.toLowerCase().includes(value.toLowerCase()),
          )
        : sorted,
    [sorted, value],
  );

  return (
    <Combobox
      label={`Item, row ${rowNumber}`}
      value={value}
      onInputChange={(text) => onUpdate(rowId, text)}
      onSelect={(item, via) => onSelect(rowId, item, via)}
      openOnFocus={false}
      options={filtered}
      getKey={(item) => item.id}
      emptyText="No items found"
      minListWidth={300}
      placeholder="Search item..."
      className="border border-transparent rounded-md bg-transparent text-sm outline-none w-full px-2 py-1.5 hover:border-slate-200 hover:bg-white focus:border-blue-400 focus:bg-white transition-all"
      renderOption={(item) => (
        <div className="px-3 py-2">
          <div className="text-sm font-semibold text-slate-800">{item.name}</div>
          <div className="text-xs text-slate-500 mt-0.5 flex gap-3">
            <span>GST {(item.taxSlab as any)?.rate ?? 0}%</span>
            <span>
              Stock {item.batches.reduce((sum, b) => sum + b.currentQty, 0)}
            </span>
          </div>
        </div>
      )}
    />
  );
}

export default function PurchaseEntry() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Customer[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [purchaseNo, setPurchaseNo] = useState("FP-0001");
  const [purchaseDate, setPurchaseDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [supplier, setSupplier] = useState<Customer | null>(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [rows, setRows] = useState<PRow[]>([newRow(1)]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    authFetch(`${API}/purchases/next-no`)
      .then((r) => r.json())
      .then((d) => {
        if (d.purchaseNo) setPurchaseNo(d.purchaseNo);
      })
      .catch(() => {});
    Promise.all([customerApi.getAll(), itemApi.getAll()])
      .then(([c, i]) => {
        setSuppliers(c);
        setAllItems(i);
      })
      .catch(console.error);
  }, []);


  const calcedRows = rows.map((r) => calcRow(r));
  const filledRows = calcedRows.filter(
    (r) => r.itemName && parseFloat(r.qty) > 0,
  );
  const totTaxable = r2(filledRows.reduce((s, r) => s + r.taxable, 0));
  const totTax = r2(filledRows.reduce((s, r) => s + r.taxAmt, 0));
  const totDisc = r2(filledRows.reduce((s, r) => s + r.discAmt, 0));
  const grand = r2(totTaxable + totTax);

  const upd = (id: number, field: string, val: string) =>
    setRows((p) =>
      p.map((r) => (r.id === id ? calcRow({ ...r, [field]: val }) : r)),
    );

  // Typing over a picked item must not keep the old item's batch and rate.
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
              mrp: "",
              rate: "",
              _batches: [],
            }),
      ),
    );
  }

  function selectItem(rowId: number, item: Item) {
    const batches = item.batches || [];
    const fb = batches[0] || null;
    setRows((p) =>
      p.map((r) => {
        if (r.id !== rowId) return r;
        return calcRow({
          ...r,
          itemName: item.name,
          itemId: item.id,
          hsn: (item.hsn as any)?.code || "",
          gst: (item.taxSlab as any)?.rate ?? 0,
          per: item.unit,
          _batches: batches,
          batchNo: fb?.batchNo || "",
          batchId: fb?.id ?? null,
          mrp: String(fb?.mrp ?? ""),
          rate: String(fb?.purchasePrice ?? ""),
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
          mrp: String(batch.mrp ?? ""),
          rate: String(batch.purchasePrice ?? ""),
        });
      }),
    );
  }

  const sortedSuppliers = useMemo(
    () => [...suppliers].sort((a, b) => a.name.localeCompare(b.name)),
    [suppliers],
  );
  const filteredSuppliers = useMemo(
    () =>
      supplierSearch.trim()
        ? sortedSuppliers.filter((s) =>
            s.name.toLowerCase().includes(supplierSearch.toLowerCase()),
          )
        : sortedSuppliers,
    [sortedSuppliers, supplierSearch],
  );

  async function handleSave(printMode?: "voucher" | "grn") {
    const unpicked = rows.find((r) => r.itemName.trim() && r.itemId === null);
    if (unpicked) {
      setError(`${unpicked.itemName}: pick this item from the list.`);
      return;
    }
    if (!supplier) {
      setError("Select a supplier");
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
        supplierId: supplier.id,
        purchaseDate,
        notes: notes.trim() || undefined,
        rows: filledRows.map((r) => ({
          itemId: r.itemId,
          batchId: r.batchId,
          itemName: r.itemName,
          hsn: r.hsn,
          mrp: r.mrp,
          rate: r.rate,
          qty: r.qty,
          freeQty: r.freeQty,
          per: r.per,
          disc: r.disc,
          gst: r.gst,
        })),
      };
      const res = await authFetch(`${API}/purchases`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const created = await res.json();
      refreshStockLists();
      if (printMode) {
        await openPrint(created.id, printMode);
      }
      navigate("/purchases");
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function openPrint(id: number, mode: "voucher" | "grn") {
    try {
      const res = await authFetch(`${API}/purchases/${id}`);
      const full = await res.json();
      const sup = full.supplier || {};
      const data = {
        mode,
        purchaseNo: full.purchaseNo,
        purchaseDate: full.purchaseDate,
        taxType: full.taxType,
        supplier: {
          name: sup.name || "",
          address: sup.address || "",
          state: full.supplierState || sup.state || "",
          stateCode: full.supplierStateCode || sup.stateCode || "",
          mobile: sup.mobile || "",
          gstin: full.supplierGstin || sup.gstin || "",
        },
        rows: (full.items || []).map((item: any) => ({
          itemName: item.itemName,
          hsn: item.hsnCode,
          batchNo: item.batch?.batchNo || "-",
          mfgDate: item.batch?.mfgDate || "-",
          expiryDate: item.batch?.expiryDate || "-",
          qty: item.qty,
          freeQty: item.freeQty || 0,
          per: item.per || "Pcs",
          rate: item.rate || 0,
          disc: item.discPercent || 0,
          gst: item.gstPercent || 0,
          netValue: item.netValue || 0,
        })),
        totalDiscount: full.totalDiscount || 0,
        totalTaxable: full.totalTaxable || 0,
        cgstAmt: full.cgstAmt || 0,
        sgstAmt: full.sgstAmt || 0,
        igstAmt: full.igstAmt || 0,
        totalTax: full.totalTax || 0,
        grandTotal: full.grandTotal || 0,
        notes: full.notes || "",
      };
      localStorage.setItem("erp_purchase_print", JSON.stringify(data));
      window.open("/purchase-print.html", "_blank");
    } catch {
      // print failure shouldn't block save flow
    }
  }

  const inp =
    "border border-slate-200 rounded-lg bg-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all";
  const ti =
    "border border-transparent rounded-md bg-transparent text-xs outline-none w-full px-1.5 py-1 text-right hover:border-slate-200 hover:bg-white focus:border-blue-400 focus:bg-white transition-all";

  return (
    <div className="ledger-sheet min-h-screen flex flex-col">
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/purchases")}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 text-lg"
          >
            ←
          </button>
          <div>
            <div className="font-bold text-slate-800 text-[15px]">
              New Purchase
            </div>
            <div className="text-xs text-slate-400">Purchase</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-1.5">
            <span className="text-sm font-bold text-blue-700">
              {purchaseNo}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-1.5 rounded-lg">
              {error}
            </div>
          )}
          <button
            onClick={() => handleSave("grn")}
            disabled={saving}
            title="Save and print Goods Received Note"
            className="px-3 py-2 text-sm bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            Save & GRN
          </button>
          <button
            onClick={() => handleSave("voucher")}
            disabled={saving}
            title="Save and print Purchase Voucher"
            className="px-3 py-2 text-sm bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            Save & Voucher
          </button>
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-4">
        <div className="border-t-[1.5px] border-ink">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700 text-sm">
              Purchase Details
            </h2>
          </div>
          <div className="px-5 py-4 grid grid-cols-4 gap-4">
            <div className="col-span-2">
              <label
                htmlFor="purchase-supplier"
                className="text-xs font-semibold text-slate-600 block mb-1.5"
              >
                Supplier *
              </label>
              <Combobox
                id="purchase-supplier"
                value={supplier ? supplier.name : supplierSearch}
                onInputChange={(text) => {
                  setSupplierSearch(text);
                  setSupplier(null);
                }}
                onSelect={(s) => {
                  setSupplier(s);
                  setSupplierSearch("");
                }}
                openOnFocus={false}
                options={filteredSuppliers}
                getKey={(s) => s.id}
                emptyText="No suppliers found"
                placeholder="Search supplier..."
                className={`${inp} w-full px-3 py-2.5`}
                renderOption={(s) => (
                  <div className="px-4 py-2.5">
                    <div className="text-sm font-semibold text-slate-800">
                      {s.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {s.gstin || "No GSTIN"}
                    </div>
                  </div>
                )}
              />
            </div>
            <div>
              <label
                htmlFor="purchase-date"
                className="text-xs font-semibold text-slate-600 block mb-1.5"
              >
                Purchase Date
              </label>
              <input
                id="purchase-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className={`${inp} w-full px-3 py-2.5`}
              />
            </div>
          </div>
        </div>

        <div className="border-t-[1.5px] border-ink">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 text-sm">Items</h2>
            <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              {filledRows.length} item(s)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: 1100 }}>
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  {[
                    ["#", 36],
                    ["Item Name", 200],
                    ["HSN", 80],
                    ["Batch", 110],
                    ["MRP", 72],
                    ["Rate", 80],
                    ["Qty", 64],
                    ["Free", 56],
                    ["Dis%", 60],
                    ["GST%", 60],
                    ["Taxable", 90],
                    ["Total", 90],
                    ["", 36],
                  ].map(([l, w]) => (
                    <th
                      key={l}
                      style={{ width: w, minWidth: w }}
                      className="px-2 py-2.5 text-xs font-semibold text-slate-500 text-center whitespace-nowrap"
                    >
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const calc = calcedRows[idx];
                  const masterItem = allItems.find((i) => i.id === row.itemId);
                  const bList =
                    row._batches.length > 0
                      ? row._batches
                      : masterItem?.batches || [];
                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-50 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/20"}`}
                    >
                      <td className="px-2 py-2 text-center text-xs text-slate-300">
                        {idx + 1}
                      </td>
                      <td className="px-2 py-1.5">
                        <ItemSearch
                          value={row.itemName}
                          rowId={row.id}
                          rowNumber={idx + 1}
                          allItems={allItems}
                          onSelect={selectItem}
                          onUpdate={typeItemName}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          aria-label={`HSN, row ${idx + 1}`}
                          value={row.hsn}
                          readOnly
                          className={`${ti} text-slate-400 text-center border-transparent bg-slate-50/80`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          aria-label={`Batch, row ${idx + 1}`}
                          value={
                            row.batchId !== null ? String(row.batchId) : ""
                          }
                          onChange={(e) => {
                            const b = bList.find(
                              (x: any) => String(x.id) === e.target.value,
                            );
                            if (b) selectBatch(row.id, b);
                          }}
                          className="border border-slate-200 rounded-md text-xs bg-white outline-none w-full px-1.5 py-1 cursor-pointer"
                        >
                          <option value="">-- Batch --</option>
                          {bList.map((b: any) => (
                            <option key={b.id} value={String(b.id)}>
                              {b.batchNo}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          aria-label={`MRP, row ${idx + 1}`}
                          value={row.mrp}
                          onChange={(e) => upd(row.id, "mrp", e.target.value)}
                          className={ti}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          aria-label={`Rate, row ${idx + 1}`}
                          value={row.rate}
                          onChange={(e) => upd(row.id, "rate", e.target.value)}
                          className={ti}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          aria-label={`Qty, row ${idx + 1}`}
                          value={row.qty}
                          onChange={(e) => upd(row.id, "qty", e.target.value)}
                          className={ti}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          aria-label={`Free, row ${idx + 1}`}
                          value={row.freeQty}
                          onChange={(e) =>
                            upd(row.id, "freeQty", e.target.value)
                          }
                          className={ti}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          aria-label={`Discount percent, row ${idx + 1}`}
                          value={row.disc}
                          onChange={(e) => upd(row.id, "disc", e.target.value)}
                          className={ti}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={row.gst || ""}
                          readOnly
                          className={`${ti} text-slate-400 text-center border-transparent bg-slate-50/80`}
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-slate-500">
                        {calc.taxable > 0 ? `₹${fmt(calc.taxable)}` : "-"}
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-bold text-slate-800">
                        {calc.netValue > 0 ? `₹${fmt(calc.netValue)}` : "-"}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => {
                            if (rows.length > 1)
                              setRows((p) => p.filter((r) => r.id !== row.id));
                          }}
                          className="w-6 h-6 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center mx-auto text-lg"
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
              onClick={() => setRows((p) => [...p, newRow(Date.now())])}
              className="flex items-center gap-1.5 text-sm text-blue-600 border border-dashed border-blue-200 rounded-xl px-4 py-2 hover:bg-blue-50/50 transition-all"
            >
              <span className="text-lg">+</span> Add Item
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_18rem] gap-4 items-stretch">
          <div className="border-t-[1.5px] border-ink min-w-0 flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-700 text-sm">
                Notes / Remarks
              </h2>
            </div>
            <div className="px-5 py-4 flex-1">
              <textarea
                aria-label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional: internal remarks, supplier notes, PO reference, etc."
                className={`${inp} w-full h-full px-3 py-2.5 resize-none min-h-[140px]`}
              />
            </div>
          </div>

          <div className="border-t-[1.5px] border-ink p-5">
            <h2 className="font-semibold text-slate-700 text-sm mb-4">
              Summary
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Discount</span>
                <span>₹{fmt(totDisc)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Taxable</span>
                <span>₹{fmt(totTaxable)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tax</span>
                <span>₹{fmt(totTax)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-base">
                <span>Grand Total</span>
                <span className="text-blue-600 text-xl">₹{fmt(grand)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="h-16" />
      </div>

      <div className="bg-paper border-t-[1.5px] border-ink pl-7 pr-6 py-1.5 flex items-end sticky bottom-0 z-40">
        {[
          ["Items", String(filledRows.length)],
          ["Taxable", `₹${fmt(totTaxable)}`],
          ["Tax", `₹${fmt(totTax)}`],
          ["Net", `₹${fmt(grand)}`],
        ].map(([l, v], i, a) => (
          <div
            key={l}
            className={i === a.length - 1 ? "ledger-total ml-auto pl-6 text-right" : "flex-1 pr-3"}
          >
            <div className="text-xs text-slate-500">{l}</div>
            <div
              className={`font-bold text-ink ${i === a.length - 1 ? "text-[28px] leading-tight" : "text-base"}`}
            >
              {v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
