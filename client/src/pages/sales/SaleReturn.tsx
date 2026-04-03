import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { invoiceApi } from "../../utils/api";
import { fmt } from "../../utils/invoice.utils";
import type { Invoice, TaxType } from "../../types";

const r2 = (v: number) => Math.round(v * 100) / 100;

interface ReturnRow {
  invoiceItemId: number;
  itemName: string;
  hsnCode: string;
  batchNo: string;
  originalQty: number;
  returnedQty: number;
  availableQty: number;
  returnQty: string;
  rate: number;
  disc: number;
  gst: number;
  taxable: number;
  taxAmt: number;
  netValue: number;
  selected: boolean;
}

function calcReturnRow(row: ReturnRow): ReturnRow {
  const qty = parseFloat(row.returnQty) || 0;
  const taxable = r2(row.rate * qty * (1 - row.disc / 100));
  const taxAmt = r2((taxable * row.gst) / 100);
  const netValue = r2(taxable + taxAmt);
  return { ...row, taxable, taxAmt, netValue };
}

export default function SaleReturn() {
  const navigate = useNavigate();

  const [step, setStep] = useState<"select" | "return">("select");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [selectedInv, setSelectedInv] = useState<Invoice | null>(null);
  const [returnRows, setReturnRows] = useState<ReturnRow[]>([]);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoiceApi
      .getAll()
      .then((data) => setInvoices(data))
      .catch(() => setError("Failed to load invoices"))
      .finally(() => setLoading(false));
  }, []);

  function selectInvoice(inv: Invoice) {
    const rows = (inv.items || []).map((item: any) => {
      const returnedQty = Number(item.returnedQty || 0);
      const availableQty = Number(item.qty) - returnedQty;

      return {
        invoiceItemId: item.id,
        itemName: item.itemName,
        hsnCode: item.hsnCode,
        batchNo: item.batch?.batchNo || "",
        originalQty: Number(item.qty),
        returnedQty,
        availableQty,
        returnQty: "",
        rate: Number(item.rate),
        disc: Number(item.discPercent || 0),
        gst: Number(item.gstPercent || 0),
        taxable: 0,
        taxAmt: 0,
        netValue: 0,
        selected: false,
      };
    });

    setSelectedInv(inv);
    setReturnRows(rows);
    setError("");

    if (!rows.length) {
      setError("This invoice has no items to return");
      return;
    }

    setStep("return");
  }

  function toggleRow(idx: number) {
    setReturnRows((p) =>
      p.map((r, i) => {
        if (i !== idx) return r;

        const nextSelected = !r.selected;
        const nextQty =
          nextSelected && r.availableQty > 0 ? String(r.availableQty) : "";

        return calcReturnRow({
          ...r,
          selected: nextSelected,
          returnQty: nextQty,
        });
      }),
    );
  }

  function updateQty(idx: number, val: string) {
    setReturnRows((p) =>
      p.map((r, i) => {
        if (i !== idx) return r;

        const qty = parseFloat(val) || 0;
        if (qty > r.availableQty) return r;

        return calcReturnRow({
          ...r,
          returnQty: val,
          selected: qty > 0,
        });
      }),
    );
  }

  const selectedRows = returnRows.filter(
    (r) => r.selected && parseFloat(r.returnQty) > 0,
  );
  const calcedSelected = selectedRows.map((r) => calcReturnRow(r));

  const totTaxable = r2(calcedSelected.reduce((s, r) => s + r.taxable, 0));
  const totTax = r2(calcedSelected.reduce((s, r) => s + r.taxAmt, 0));
  const totCredit = r2(totTaxable + totTax);

  const taxType: TaxType = (selectedInv?.taxType as TaxType) || "CGST_SGST";
  const totCgst = taxType === "CGST_SGST" ? r2(totTax / 2) : 0;
  const totSgst = taxType === "CGST_SGST" ? r2(totTax / 2) : 0;
  const totIgst = taxType === "IGST" ? totTax : 0;

  async function handleSave() {
    if (!selectedInv) {
      setError("No invoice selected");
      return;
    }

    if (!selectedRows.length) {
      setError("Select at least one item to return");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await invoiceApi.createReturn(selectedInv.id, {
        reason,
        items: selectedRows.map((r) => ({
          invoiceItemId: r.invoiceItemId,
          qty: parseFloat(r.returnQty),
        })),
      });

      setDone(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to process return");
    } finally {
      setSaving(false);
    }
  }

  const inp =
    "border border-slate-200 rounded-lg bg-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all";

  if (done) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center max-w-md">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            ✓
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Return Processed
          </h2>
          <p className="text-slate-500 text-sm mb-2">
            Credit Note created for <b>{selectedInv?.customer?.name}</b>
          </p>
          <p className="text-2xl font-bold text-emerald-600 mb-6">
            ₹{fmt(totCredit)}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate("/sales")}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              Go to Invoices
            </button>
            <button
              onClick={() => {
                setDone(false);
                setStep("select");
                setSelectedInv(null);
                setSearch("");
                setReason("");
                setReturnRows([]);
              }}
              className="px-5 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              New Return
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "select") {
    const filtered = invoices.filter(
      (i) =>
        String(i.invoiceNo).includes(search) ||
        i.customer?.name?.toLowerCase().includes(search.toLowerCase()),
    );

    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4 sticky top-0 z-50 shadow-sm">
          <button
            onClick={() => navigate("/sales")}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 text-lg"
          >
            ←
          </button>
          <div>
            <div className="font-bold text-slate-800 text-[15px]">
              Sales Return
            </div>
            <div className="text-xs text-slate-400">
              Select invoice to return against
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by invoice number or customer name..."
                className={`${inp} w-full px-4 py-2.5`}
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                No invoices found
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filtered.map((inv: any) => (
                  <div
                    key={inv.id}
                    onClick={() => selectInvoice(inv)}
                    className="px-5 py-4 cursor-pointer hover:bg-blue-50/40 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-blue-700 text-sm">
                          #{inv.invoiceNo}
                        </span>
                        <span className="text-sm font-semibold text-slate-800">
                          {inv.customer?.name}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            inv.status === "SAVED"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-slate-400">
                        <span>
                          {new Date(inv.invoiceDate).toLocaleDateString(
                            "en-IN",
                          )}
                        </span>
                        <span>{inv.items?.length || 0} items</span>
                        <span>
                          {inv.taxType === "CGST_SGST" ? "CGST+SGST" : "IGST"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-slate-800">
                        ₹{fmt(inv.grandTotal)}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Select →
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setStep("select")}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 text-lg"
          >
            ←
          </button>
          <div>
            <div className="font-bold text-slate-800 text-[15px]">
              Sales Return
            </div>
            <div className="text-xs text-slate-400">
              Invoice #{selectedInv?.invoiceNo} · {selectedInv?.customer?.name}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-1.5 rounded-lg">
              {error}
            </div>
          )}
          <button
            onClick={() => setStep("select")}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedRows.length}
            className="px-5 py-2 text-sm bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Process Return
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-6 text-sm flex-wrap">
          <span className="text-amber-700 font-semibold">Original Invoice</span>
          <span className="text-slate-600">
            Date:{" "}
            <b>
              {selectedInv &&
                new Date(selectedInv.invoiceDate).toLocaleDateString("en-IN")}
            </b>
          </span>
          <span className="text-slate-600">
            Terms: <b>{selectedInv?.terms}</b>
          </span>
          <span className="text-slate-600">
            Total:{" "}
            <b className="text-slate-800">
              ₹{fmt(selectedInv?.grandTotal || 0)}
            </b>
          </span>
          <span className="text-slate-600">
            Tax:{" "}
            <b>{selectedInv?.taxType === "CGST_SGST" ? "CGST+SGST" : "IGST"}</b>
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 text-sm">
              Select Items to Return
            </h2>
            <span className="text-xs text-slate-400">
              {selectedRows.length} item(s) selected
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-fixed" style={{ minWidth: 980 }}>
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  {[
                    "",
                    "Item",
                    "HSN",
                    "Batch",
                    "Sold Qty",
                    "Returned Qty",
                    "Available",
                    "Return Qty",
                    "Rate",
                    "Disc%",
                    "GST%",
                    "Taxable",
                    "Credit",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-xs font-semibold text-slate-500 text-left whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {returnRows.map((row, idx) => {
                  const calc = calcReturnRow(row);

                  return (
                    <tr
                      key={row.invoiceItemId}
                      className={`border-b border-slate-50 transition-colors ${
                        row.selected ? "bg-red-50/30" : "hover:bg-slate-50/40"
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <div
                          onClick={() => row.availableQty > 0 && toggleRow(idx)}
                          className={`w-5 h-5 rounded border-2 cursor-pointer flex items-center justify-center transition-all ${
                            row.selected
                              ? "bg-red-500 border-red-500"
                              : "border-slate-300 bg-white"
                          } ${row.availableQty <= 0 ? "opacity-40 cursor-not-allowed" : ""}`}
                        >
                          {row.selected && (
                            <span className="text-white text-xs font-bold leading-none">
                              ✓
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-2.5 text-sm font-medium text-slate-800">
                        {row.itemName}
                      </td>

                      <td className="px-3 py-2.5 text-xs text-slate-500">
                        {row.hsnCode}
                      </td>

                      <td className="px-3 py-2.5 text-xs font-mono text-blue-700">
                        {row.batchNo || "-"}
                      </td>

                      <td className="px-3 py-2.5 text-sm text-slate-600 text-center">
                        {row.originalQty}
                      </td>

                      <td className="px-3 py-2.5 text-sm text-slate-600 text-center">
                        {row.returnedQty}
                      </td>

                      <td className="px-3 py-2.5 text-sm font-semibold text-slate-700 text-center">
                        {row.availableQty}
                      </td>

                      <td className="px-3 py-2.5" style={{ width: 90 }}>
                        <input
                          type="number"
                          value={row.returnQty}
                          onChange={(e) => updateQty(idx, e.target.value)}
                          min={0}
                          max={row.availableQty}
                          placeholder="0"
                          disabled={row.availableQty <= 0}
                          className="border text-center border-slate-200 rounded-md text-xs w-full px-2 py-1.5 outline-none focus:border-red-400 bg-white disabled:bg-slate-100"
                        />
                        {parseFloat(row.returnQty) > row.availableQty && (
                          <div className="text-xs text-red-500 mt-0.5">
                            Max: {row.availableQty}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2.5 text-xs text-slate-600 text-center">
                        ₹{fmt(row.rate)}
                      </td>

                      <td className="px-3 py-2.5 text-xs text-slate-600 text-center">
                        {row.disc}%
                      </td>

                      <td className="px-3 py-2.5 text-xs text-slate-600 text-center">
                        {row.gst}%
                      </td>

                      <td className="px-3 py-2.5 text-xs text-slate-600 text-center">
                        {row.selected && calc.taxable > 0
                          ? `₹${fmt(calc.taxable)}`
                          : "—"}
                      </td>

                      <td className="px-3 py-2.5 text-sm font-bold text-red-600 text-center">
                        {row.selected && calc.netValue > 0
                          ? `₹${fmt(calc.netValue)}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-700 text-sm mb-3">
              Return Reason
            </h2>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Damaged goods, Wrong item, Customer returned..."
              className="border border-slate-200 rounded-lg bg-white text-sm outline-none focus:border-blue-500 w-full px-3 py-2.5 resize-none h-20"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-700 text-sm mb-4">
              Credit Note Summary
            </h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Taxable Amount</span>
                <span className="font-medium text-slate-700">
                  ₹{fmt(totTaxable)}
                </span>
              </div>

              {taxType === "CGST_SGST" ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">CGST</span>
                    <span className="font-medium text-slate-700">
                      ₹{fmt(totCgst)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">SGST</span>
                    <span className="font-medium text-slate-700">
                      ₹{fmt(totSgst)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-slate-500">IGST</span>
                  <span className="font-medium text-slate-700">
                    ₹{fmt(totIgst)}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-slate-500">Total Tax</span>
                <span className="font-medium text-slate-700">
                  ₹{fmt(totTax)}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                <span className="font-bold text-slate-800 text-base">
                  Total Credit
                </span>
                <span className="font-bold text-red-600 text-2xl">
                  ₹{fmt(totCredit)}
                </span>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !selectedRows.length}
              className="mt-4 w-full py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saving && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Process Return →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
