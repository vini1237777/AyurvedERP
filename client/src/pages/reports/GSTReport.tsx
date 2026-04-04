import { useEffect, useState } from "react";
import { reportApi } from "../../utils/api";
import { fmt } from "../../utils/invoice.utils";
import { Card, LoadingScreen, PageHeader, Input } from "../../components/ui";
import { Pagination, usePagination } from "../../components/ui/Pagination";
import type { GstReportResponse } from "../../types";

const emptyData: GstReportResponse = {
  rows: [],
  summary: {
    taxableAmount: 0,
    cgstAmt: 0,
    sgstAmt: 0,
    igstAmt: 0,
    totalTax: 0,
    grandTotal: 0,
  },
};

function exportCSV(data: GstReportResponse) {
  const headers = [
    "Invoice No",
    "Date",
    "Customer",
    "GSTIN",
    "Tax Type",
    "Taxable",
    "CGST",
    "SGST",
    "IGST",
    "Total",
  ];
  const rows = data.rows.map((r) => [
    r.invoiceNo,
    new Date(r.invoiceDate).toLocaleDateString("en-IN"),
    r.customerName,
    r.customerGstin || "",
    r.taxType === "CGST_SGST" ? "CGST+SGST" : "IGST",
    r.taxableAmount,
    r.cgstAmt,
    r.sgstAmt,
    r.igstAmt,
    r.grandTotal,
  ]);
  const csv = [headers, ...rows]
    .map((row) =>
      row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "gst-report.csv";
  a.click();
}

function exportPDF(data: GstReportResponse) {
  const win = window.open("", "_blank")!;
  const s = data.summary;
  const trs = data.rows
    .map(
      (r) =>
        `<tr><td>#${r.invoiceNo}</td><td>${new Date(r.invoiceDate).toLocaleDateString("en-IN")}</td><td>${r.customerName}</td><td>${r.customerGstin || "-"}</td><td>${r.taxType === "CGST_SGST" ? "CGST+SGST" : "IGST"}</td><td>₹${fmt(r.taxableAmount)}</td><td>₹${fmt(r.cgstAmt)}</td><td>₹${fmt(r.sgstAmt)}</td><td>₹${fmt(r.igstAmt)}</td><td>₹${fmt(r.grandTotal)}</td></tr>`,
    )
    .join("");
  win.document.write(
    `<html><head><title>GST Report</title><style>body{font-family:Arial;font-size:11px;padding:20px}h2{margin-bottom:4px}p{color:#64748b;font-size:10px;margin-bottom:12px}.summary{display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap}.scard{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px}.slabel{font-size:9px;color:#64748b;margin-bottom:2px}.sval{font-size:13px;font-weight:bold}table{width:100%;border-collapse:collapse}th{background:#f1f5f9;border:1px solid #cbd5e1;padding:6px 8px;text-align:left;font-size:10px}td{border:1px solid #e2e8f0;padding:5px 8px}tr:nth-child(even){background:#f8fafc}</style></head><body><h2>GST Report</h2><p>Fulanand Ayurved, Tasgaon</p><div class="summary"><div class="scard"><div class="slabel">Taxable</div><div class="sval">₹${fmt(s.taxableAmount)}</div></div><div class="scard"><div class="slabel">CGST</div><div class="sval">₹${fmt(s.cgstAmt)}</div></div><div class="scard"><div class="slabel">SGST</div><div class="sval">₹${fmt(s.sgstAmt)}</div></div><div class="scard"><div class="slabel">IGST</div><div class="sval">₹${fmt(s.igstAmt)}</div></div><div class="scard"><div class="slabel">Total Tax</div><div class="sval">₹${fmt(s.totalTax)}</div></div><div class="scard"><div class="slabel">Grand Total</div><div class="sval">₹${fmt(s.grandTotal)}</div></div></div><table><thead><tr><th>Invoice No</th><th>Date</th><th>Customer</th><th>GSTIN</th><th>Tax Type</th><th>Taxable</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Total</th></tr></thead><tbody>${trs}</tbody></table></body></html>`,
  );
  win.document.close();
  win.print();
}

export default function GSTReport() {
  const [data, setData] = useState<GstReportResponse>(emptyData);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await reportApi.getGstReport({
        from: from || undefined,
        to: to || undefined,
      });
      setData(res);
      pg.reset();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pg = usePagination(data.rows, 50);
  const s = data.summary;

  return (
    <div>
      <PageHeader title="GST Report" subtitle="Tax-wise sales summary" />

      <Card className="p-4 mb-4">
        <div className="grid grid-cols-3 gap-3">
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

      {/* Summary cards */}
      <div className="grid grid-cols-6 gap-4 mb-4">
        {(
          [
            ["Taxable", s.taxableAmount],
            ["CGST", s.cgstAmt],
            ["SGST", s.sgstAmt],
            ["IGST", s.igstAmt],
            ["Total Tax", s.totalTax],
            ["Grand Total", s.grandTotal],
          ] as [string, number][]
        ).map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className="text-lg font-bold text-slate-800">₹{fmt(value)}</p>
          </Card>
        ))}
      </div>

      <Card>
        {loading ? (
          <LoadingScreen />
        ) : (
          <>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-semibold text-slate-800">
                GST Details{" "}
                <span className="text-slate-400 font-normal text-sm ml-2">
                  {data.rows.length} invoices
                </span>
              </h2>
              {data.rows.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => exportCSV(data)}
                    className="px-3 py-1.5 text-xs font-semibold border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                  >
                    ⬇ CSV
                  </button>
                  <button
                    onClick={() => exportPDF(data)}
                    className="px-3 py-1.5 text-xs font-semibold border border-blue-200 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
                  >
                    🖨 PDF
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    {[
                      "Invoice No",
                      "Date",
                      "Customer",
                      "GSTIN",
                      "Tax Type",
                      "Taxable",
                      "CGST",
                      "SGST",
                      "IGST",
                      "Total",
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
                  {pg.paginated.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-50 hover:bg-slate-50"
                    >
                      <td className="px-5 py-3 text-sm font-mono font-semibold text-blue-700">
                        #{row.invoiceNo}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {new Date(row.invoiceDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-800">
                        {row.customerName}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {row.customerGstin || "-"}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {row.taxType === "CGST_SGST" ? "CGST+SGST" : "IGST"}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-700">
                        ₹{fmt(row.taxableAmount)}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-700">
                        ₹{fmt(row.cgstAmt)}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-700">
                        ₹{fmt(row.sgstAmt)}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-700">
                        ₹{fmt(row.igstAmt)}
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold text-slate-800">
                        ₹{fmt(row.grandTotal)}
                      </td>
                    </tr>
                  ))}
                  {data.rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-5 py-10 text-center text-sm text-slate-500"
                      >
                        No GST data found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {data.rows.length > 0 && (
              <Pagination
                total={pg.total}
                page={pg.page}
                perPage={pg.perPage}
                from={pg.from}
                to={pg.to}
                onPage={pg.setPage}
                onPerPage={pg.onPerPage}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}
