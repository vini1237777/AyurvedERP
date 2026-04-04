import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { invoiceApi } from "../../utils/api";
import { fmt } from "../../utils/invoice.utils";
import {
  Button,
  PageHeader,
  Card,
  Badge,
  EmptyState,
  LoadingScreen,
  Toast,
} from "../../components/ui";
import { Pagination, usePagination } from "../../components/ui/Pagination";
import type { Invoice } from "../../types";

type SortBy = "date" | "customer" | "total";
type SortOrder = "asc" | "desc";

export default function SaleList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setInvoices(await invoiceApi.getAll());
    } catch {
      setToast({ msg: "Failed to load invoices", type: "error" });
    } finally {
      setLoading(false);
    }
  }

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

  const filtered = useMemo(() => {
    return invoices.filter(
      (i) =>
        String(i.invoiceNo).toLowerCase().includes(search.toLowerCase()) ||
        i.customer.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [invoices, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];

    arr.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (sortBy === "date") {
        aVal = new Date(a.invoiceDate).getTime();
        bVal = new Date(b.invoiceDate).getTime();
      } else if (sortBy === "customer") {
        aVal = (a.customer?.name || "").toLowerCase();
        bVal = (b.customer?.name || "").toLowerCase();
      } else if (sortBy === "total") {
        aVal = a.grandTotal || 0;
        bVal = b.grandTotal || 0;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return arr;
  }, [filtered, sortBy, sortOrder]);

  const pg = usePagination(sorted, 50);
  const totalSales = sorted.reduce((s, i) => s + i.grandTotal, 0);

  async function handlePrint(inv: Invoice) {
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
        taxType: full.taxType,
        totDisc: full.totalDiscount || 0,
        totTaxable: full.totalTaxable || 0,
        totCgst: full.cgstAmt || 0,
        totSgst: full.sgstAmt || 0,
        totIgst: full.igstAmt || 0,
        totTax: full.totalTax || 0,
        grand: full.grandTotal || 0,
      };

      localStorage.setItem("fulanand_print_data", JSON.stringify(data));
      window.open("/invoice-print.html", "_blank");
    } catch {
      setToast({ msg: "Failed to open invoice", type: "error" });
    }
  }

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
        subtitle={`${sorted.length} invoices · Total: ₹${fmt(totalSales)}`}
        actions={
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice or party..."
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 outline-none focus:border-blue-500"
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-500"
            >
              <option value="date">Sort by Date</option>
              <option value="customer">Sort by Customer</option>
              <option value="total">Sort by Total</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-500"
            >
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>

            <Link to="/sales/new">
              <Button>+ New Sale</Button>
            </Link>
          </>
        }
      />

      {loading ? (
        <LoadingScreen />
      ) : (
        <Card>
          {sorted.length === 0 ? (
            <EmptyState
              title="No invoices found"
              action={
                <Link to="/sales/new">
                  <Button>+ New Sale</Button>
                </Link>
              }
            />
          ) : (
            <>
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
                          className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pg.paginated.map((inv) => (
                      <tr
                        key={inv.id}
                        className="border-b border-slate-50 hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-blue-700 text-sm">
                          #{inv.invoiceNo}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                          {new Date(inv.invoiceDate).toLocaleDateString(
                            "en-IN",
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-800 font-medium">
                          {inv.customer.name}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {inv.customerGstin || "B2C"}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          ₹{fmt(inv.totalTaxable)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          ₹{fmt(inv.totalTax)}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-800">
                          ₹{fmt(inv.grandTotal)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            color={inv.status === "SAVED" ? "green" : "red"}
                          >
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

              <Pagination
                total={pg.total}
                page={pg.page}
                perPage={pg.perPage}
                from={pg.from}
                to={pg.to}
                onPage={pg.setPage}
                onPerPage={pg.onPerPage}
              />
            </>
          )}
        </Card>
      )}
    </div>
  );
}
