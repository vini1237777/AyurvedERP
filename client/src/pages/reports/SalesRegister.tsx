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

export default function SaleRegister() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [customerId, setCustomerId] = useState("");

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
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const total = rows.reduce((s, r) => s + r.grandTotal, 0);

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
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Sales</h2>
              <div className="text-sm font-semibold text-slate-700">
                Total: ₹{fmt(total)}
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
                  {rows.map((inv) => (
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
          </>
        )}
      </Card>
    </div>
  );
}
