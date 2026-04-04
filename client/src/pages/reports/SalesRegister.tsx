import { useEffect, useState } from "react";
import { customerApi, reportApi } from "../../utils/api";
import { fmt } from "../../utils/invoice.utils";
import {
  Card,
  LoadingScreen,
  PageHeader,
  Input,
  Select,
  Badge,
} from "../../components/ui";
import type { Customer, Invoice } from "../../types";

// ── Reusable Pagination ───────────────────────────────────────────────────────
function Pagination({
  total,
  page,
  perPage,
  onPage,
  onPerPage,
}: {
  total: number;
  page: number;
  perPage: number;
  onPage: (p: number) => void;
  onPerPage: (n: number) => void;
}) {
  const totalPages = Math.ceil(total / perPage);
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  function pages() {
    const p: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) p.push(i);
      return p;
    }
    p.push(1);
    if (page > 3) p.push("...");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    )
      p.push(i);
    if (page < totalPages - 2) p.push("...");
    p.push(totalPages);
    return p;
  }

  const btn = (
    label: string | number,
    active: boolean,
    disabled: boolean,
    onClick: () => void,
  ) => (
    <button
      key={label}
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors
        ${active ? "bg-blue-600 text-white" : ""}
        ${!active && !disabled ? "hover:bg-slate-100 text-slate-600" : ""}
        ${disabled ? "text-slate-300 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {label}
    </button>
  );

  return (
    <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Show:</span>
        {[25, 50, 100].map((n) => (
          <button
            key={n}
            onClick={() => {
              onPerPage(n);
              onPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${perPage === n ? "bg-blue-50 text-blue-700 border border-blue-200" : "hover:bg-slate-100 text-slate-600"}`}
          >
            {n}
          </button>
        ))}
        <span className="ml-2 text-slate-400">
          {from}–{to} of <b className="text-slate-600">{total}</b>
        </span>
      </div>
      <div className="flex items-center gap-1">
        {btn("«", false, page === 1, () => onPage(1))}
        {btn("‹", false, page === 1, () => onPage(page - 1))}
        {pages().map((p, i) =>
          p === "..." ? (
            <span key={`d${i}`} className="px-2 text-slate-300 text-xs">
              …
            </span>
          ) : (
            btn(p, p === page, false, () => onPage(Number(p)))
          ),
        )}
        {btn("›", false, page === totalPages, () => onPage(page + 1))}
        {btn("»", false, page === totalPages, () => onPage(totalPages))}
      </div>
    </div>
  );
}

// ── Export helpers ────────────────────────────────────────────────────────────
function exportCSV(rows: Invoice[]) {
  const headers = [
    "Invoice No",
    "Date",
    "Customer",
    "Tax Type",
    "Taxable",
    "Tax",
    "Amount",
    "Status",
  ];
  const data = rows.map((r) => [
    r.invoiceNo,
    new Date(r.invoiceDate).toLocaleDateString("en-IN"),
    r.customer?.name || "",
    r.taxType === "CGST_SGST" ? "CGST+SGST" : "IGST",
    r.totalTaxable,
    r.totalTax,
    r.grandTotal,
    r.status,
  ]);
  const csv = [headers, ...data]
    .map((row) =>
      row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "sale-register.csv";
  a.click();
}

function exportPDF(rows: Invoice[], total: number) {
  const win = window.open("", "_blank")!;
  const trs = rows
    .map(
      (r) =>
        `<tr><td>#${r.invoiceNo}</td><td>${new Date(r.invoiceDate).toLocaleDateString("en-IN")}</td><td>${r.customer?.name || ""}</td><td>${r.taxType === "CGST_SGST" ? "CGST+SGST" : "IGST"}</td><td>₹${fmt(r.totalTaxable)}</td><td>₹${fmt(r.totalTax)}</td><td>₹${fmt(r.grandTotal)}</td><td>${r.status}</td></tr>`,
    )
    .join("");
  win.document.write(
    `<html><head><title>Sale Register</title><style>body{font-family:Arial;font-size:11px;padding:20px}table{width:100%;border-collapse:collapse}th{background:#f1f5f9;border:1px solid #cbd5e1;padding:6px 8px;text-align:left;font-size:10px}td{border:1px solid #e2e8f0;padding:5px 8px}tr:nth-child(even){background:#f8fafc}.total{font-weight:bold;margin-top:8px;text-align:right}</style></head><body><h2>Sale Register</h2><p>Fulanand Ayurved, Tasgaon</p><table><thead><tr><th>Invoice No</th><th>Date</th><th>Customer</th><th>Tax Type</th><th>Taxable</th><th>Tax</th><th>Amount</th><th>Status</th></tr></thead><tbody>${trs}</tbody></table><div class="total">Grand Total: ₹${fmt(total)}</div></body></html>`,
  );
  win.document.close();
  win.print();
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SaleRegister() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);

  async function load() {
    setLoading(true);
    try {
      const [sales, custs] = await Promise.all([
        reportApi.getSaleRegister({
          from: from || undefined,
          to: to || undefined,
          customerId: customerId ? Number(customerId) : undefined,
        }),
        customerApi.getAll(),
      ]);
      setRows(sales);
      setCustomers(custs);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const total = rows.reduce((s, r) => s + r.grandTotal, 0);
  const paginated = rows.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      <PageHeader title="Sale Register" subtitle="Invoice-wise sales report" />

      <Card className="p-4 mb-4">
        <div className="grid grid-cols-4 gap-3">
          <Input
            type="date"
            label="From"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Input
            type="date"
            label="To"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <Select
            label="Customer"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            options={[
              { value: "", label: "All Customers" },
              ...customers.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <div className="flex items-end">
            <button
              onClick={load}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              Load Report
            </button>
          </div>
        </div>
      </Card>

      <Card>
        {loading ? (
          <LoadingScreen />
        ) : (
          <>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-semibold text-slate-800">
                Sales{" "}
                <span className="text-slate-400 font-normal text-sm ml-2">
                  {rows.length} invoices
                </span>
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-700">
                  Total: ₹{fmt(total)}
                </span>
                {rows.length > 0 && (
                  <>
                    <button
                      onClick={() => exportCSV(rows)}
                      className="px-3 py-1.5 text-xs font-semibold border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                    >
                      ⬇ CSV
                    </button>
                    <button
                      onClick={() => exportPDF(rows, total)}
                      className="px-3 py-1.5 text-xs font-semibold border border-blue-200 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
                    >
                      🖨 PDF
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    {[
                      "Invoice No",
                      "Date",
                      "Customer",
                      "Tax Type",
                      "Taxable",
                      "Tax",
                      "Amount",
                      "Status",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-semibold text-slate-500 px-5 py-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-slate-50 hover:bg-slate-50"
                    >
                      <td className="px-5 py-3 text-sm font-mono font-semibold text-blue-700">
                        #{inv.invoiceNo}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-800">
                        {inv.customer?.name}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {inv.taxType === "CGST_SGST" ? "CGST+SGST" : "IGST"}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-700">
                        ₹{fmt(inv.totalTaxable)}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-700">
                        ₹{fmt(inv.totalTax)}
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold text-slate-800">
                        ₹{fmt(inv.grandTotal)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge color={inv.status === "SAVED" ? "green" : "red"}>
                          {inv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-10 text-center text-sm text-slate-500"
                      >
                        No sales found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {rows.length > 0 && (
              <Pagination
                total={rows.length}
                page={page}
                perPage={perPage}
                onPage={setPage}
                onPerPage={setPerPage}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}
