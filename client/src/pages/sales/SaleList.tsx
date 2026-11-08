import { useState, useEffect, useCallback } from "react";
import { thAlign } from "../../components/ui/tableAlign";
import { Link, useLocation } from "react-router-dom";
import { invoiceApi } from "../../utils/api";
import { fmt, fmtDate } from "../../utils/invoice.utils";
import {
  Button,
  PageHeader,
  Card,
  Badge,
  EmptyState,
  LoadingScreen,
  Toast,
} from "../../components/ui";
import { Pagination } from "../../components/ui/Pagination";
import type { Invoice } from "../../types";

// Current financial year helper
function getCurrentFY(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (m >= 4) return `${y}-${String(y + 1).slice(2)}`;
  return `${y - 1}-${String(y).slice(2)}`;
}



function recentFYs(): string[] {
  const now = new Date();
  const y = now.getFullYear();
  const fy = (start: number) => `${start}-${String(start + 1).slice(2)}`;
  const cur = now.getMonth() + 1 >= 4 ? y : y - 1;
  return [fy(cur), fy(cur - 1), fy(cur - 2), fy(cur - 3)];
}

export default function SaleList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFY, setSelectedFY] = useState(getCurrentFY());
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const location = useLocation();
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // Wait for a pause in typing, so each key press doesn't hit the server.
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoiceApi.getAll({
        financialYear: selectedFY,
        page,
        limit: perPage,
        q: query || undefined,
        sort: sortDir,
      });
      setInvoices(res.rows || []);
      setTotal(res.total || 0);
    } catch {
      setToast({ msg: "Failed to load invoices", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [selectedFY, page, perPage, query, sortDir]);

  useEffect(() => {
    const savedNo = (location.state as { savedInvoiceNo?: string } | null)
      ?.savedInvoiceNo;
    if (!savedNo) return;
    setToast({ msg: `Invoice ${savedNo} saved`, type: "success" });
    // A refresh shouldn't announce the same save again.
    window.history.replaceState({ ...window.history.state, usr: null }, "");
    // Only the arrival from the billing screen matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedFY, perPage, query, sortDir]);

  async function handleCancel(id: number) {
    if (!confirm("Cancel this invoice? Stock will be reversed.")) return;
    try {
      await invoiceApi.cancel(id);
      setToast({ msg: "Invoice cancelled", type: "success" });
      load();
    } catch {
      setToast({ msg: "Failed to cancel", type: "error" });
    }
  }

  const filtered = invoices;

  const totalSales = filtered.reduce((s, i) => s + i.grandTotal, 0);
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  async function handlePrint(inv: Invoice, action: "print" | "pdf" = "print") {
    try {
      const full = await invoiceApi.getById(inv.id);

      const rows = (full.items || []).map((item: any) => ({
        id: item.id,
        itemId: item.itemId,
        itemName: item.itemName,
        hsn: item.hsnCode,
        hsnCode: item.hsnCode,
        batchId: item.batchId,
        batchNo: item.batch?.batchNo || "",
        _batches: item.batch
          ? [
              {
                id: item.batch.id,
                batchNo: item.batch.batchNo,
                no: item.batch.batchNo,
                expiryDate: item.batch.expiryDate,
                exp: item.batch.expiryDate,
              },
            ]
          : [],
        mrp: item.mrp || 0,
        price: item.rate,
        rate: item.rate,
        qty: item.qty,
        altQty: item.altQty || 0,
        free: item.freeQty || 0,
        freeQty: item.freeQty || 0,
        per: item.per || "Pcs",
        disc: item.discPercent || 0,
        sDis: item.sDiscPercent || 0,
        discAmt: item.discAmt || 0,
        basicAmt: item.basicAmt || 0,
        taxableAmt: item.taxableAmt || 0,
        gst: item.gstPercent || 0,
        taxAmt: item.taxAmt || 0,
        netValue: item.netValue || 0,
      }));

      const data = {
        customer: {
          name: full.customer?.name || "",
          address: full.customer?.address || "",
          mobile: full.customer?.mobile || "",
          state: full.customer?.state || "Maharashtra",
          gstin: full.customerGstin || full.customer?.gstin || "",
          stateCode: full.customerStateCode || full.customer?.stateCode || "",
        },
        rows,
        invoiceNo: full.invoiceNo,
        invoiceDate: new Date(full.invoiceDate)
          .toLocaleDateString("en-GB")
          .replace(/\//g, "-"),
        terms: full.terms,
        notes: full.notes || "",
        taxType: full.taxType,
        totDisc: full.totalDiscount || 0,
        totTaxable: full.totalTaxable || 0,
        totCgst: full.cgstAmt || 0,
        totSgst: full.sgstAmt || 0,
        totIgst: full.igstAmt || 0,
        totTax: full.totalTax || 0,
        grand: full.grandTotal || 0,
      };

      localStorage.setItem("erp_print_data", JSON.stringify(data));
      const url =
        action === "pdf" ? "/invoice-print.html?pdf=1" : "/invoice-print.html";
      window.open(url, "_blank");
    } catch {
      setToast({ msg: "Failed to open invoice", type: "error" });
    }
  }

  const fyTabs = recentFYs();

  return (
    <div>
      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <PageHeader
        title="All Invoices"
        subtitle={`${total} invoices in FY ${selectedFY}, ₹${fmt(totalSales)} on this page`}
        actions={
          <>
            <input
              aria-label="Search invoice or customer"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice or customer..."
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 outline-none focus:border-blue-500"
            />
            <button
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 whitespace-nowrap"
            >
              Date {sortDir === "desc" ? "↓" : "↑"}
            </button>
            <Link to="/sales/new">
              <Button>+ New Sale</Button>
            </Link>
          </>
        }
      />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {fyTabs.map((fy) => (
          <button
            key={fy}
            onClick={() => setSelectedFY(fy)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              selectedFY === fy
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"
            }`}
          >
            FY {fy}
            {fy === getCurrentFY() && (
              <span className="ml-1.5 text-xs opacity-75">(Current)</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingScreen />
      ) : (
        <Card>
          {filtered.length === 0 ? (
            <EmptyState
              title="No invoices found"
              action={
                <Link to="/sales/new">
                  <Button>+ New Sale</Button>
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    {[
                      "Invoice No",
                      "Date",
                      "Customer",
                      "GSTIN",
                      "Taxable",
                      "Tax",
                      "Total",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className={`${thAlign(h)} text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-slate-50 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-blue-700 text-sm whitespace-nowrap">
                        #{inv.invoiceNo}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {fmtDate(inv.invoiceDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800 font-medium">
                        {inv.customer.name}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {inv.customerGstin || "B2C"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 num">
                        ₹{fmt(inv.totalTaxable)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 num">
                        ₹{fmt(inv.totalTax)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-800 num">
                        ₹{fmt(inv.grandTotal)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={inv.status === "SAVED" ? "green" : "red"}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrint(inv)}
                          >
                            Print
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrint(inv, "pdf")}
                          >
                            PDF
                          </Button>
                          {inv.status === "SAVED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancel(inv.id)}
                              className="text-red-500"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {total > 0 && (
            <Pagination
              total={total}
              page={page}
              perPage={perPage}
              from={from}
              to={to}
              onPage={setPage}
              onPerPage={(n) => setPerPage(n)}
            />
          )}
        </Card>
      )}
    </div>
  );
}
