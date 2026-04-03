import { useEffect, useState } from "react";
import { reportApi } from "../../utils/api";
import { fmt } from "../../utils/invoice.utils";
import { Card, LoadingScreen, PageHeader, Input } from "../../components/ui";
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
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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

      <div className="grid grid-cols-6 gap-4 mb-4">
        {[
          ["Taxable", data.summary.taxableAmount],
          ["CGST", data.summary.cgstAmt],
          ["SGST", data.summary.sgstAmt],
          ["IGST", data.summary.igstAmt],
          ["Total Tax", data.summary.totalTax],
          ["Grand Total", data.summary.grandTotal],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className="text-lg font-bold text-slate-800">
              ₹{fmt(Number(value))}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        {loading ? (
          <LoadingScreen />
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
                {data.rows.map((row) => (
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
        )}
      </Card>
    </div>
  );
}
