import { useEffect, useState } from "react";
import { reportApi } from "../../utils/api";
import { fmt } from "../../utils/invoice.utils";
import { Card, LoadingScreen, PageHeader } from "../../components/ui";
import type { StockReportResponse } from "../../types";

const emptyData: StockReportResponse = {
  rows: [],
  summary: {
    totalBatches: 0,
    totalOpeningQty: 0,
    totalCurrentQty: 0,
  },
};

export default function StockReport() {
  const [data, setData] = useState<StockReportResponse>(emptyData);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await reportApi.getStockReport();
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
      <PageHeader title="Stock Report" subtitle="Batch-wise available stock" />

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1">Total Batches</p>
          <p className="text-2xl font-bold text-slate-800">
            {data.summary.totalBatches}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1">Opening Qty</p>
          <p className="text-2xl font-bold text-slate-800">
            {fmt(data.summary.totalOpeningQty)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1">Current Qty</p>
          <p className="text-2xl font-bold text-slate-800">
            {fmt(data.summary.totalCurrentQty)}
          </p>
        </Card>
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
                    "Item",
                    "HSN",
                    "Batch",
                    "Expiry",
                    "Opening Qty",
                    "Current Qty",
                    "MRP",
                    "Sale Price",
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
                    <td className="px-5 py-3 text-sm font-medium text-slate-800">
                      {row.itemName}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {row.hsnCode}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-blue-700">
                      {row.batchNo}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {row.expiryDate || "-"}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700">
                      {fmt(row.openingQty)}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-slate-800">
                      {fmt(row.currentQty)}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700">
                      ₹{fmt(row.mrp)}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700">
                      ₹{fmt(row.salePrice)}
                    </td>
                  </tr>
                ))}
                {data.rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-10 text-center text-sm text-slate-500"
                    >
                      No stock found
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
