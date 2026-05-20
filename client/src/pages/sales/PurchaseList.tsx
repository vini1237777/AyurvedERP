import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:3000/api"
).trim();

function getCurrentFY() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 4
    ? `${y}-${String(y + 1).slice(2)}`
    : `${y - 1}-${String(y).slice(2)}`;
}

export default function PurchaseList() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFY, setSelectedFY] = useState(getCurrentFY());
  const [availableFYs, setAvailableFYs] = useState<string[]>([]);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await fetch(`${API}/purchases`);
      const data = await res.json();
      setPurchases(data);
      const fys = [
        ...new Set(data.map((i: any) => i.financialYear || getCurrentFY())),
      ]
        .sort()
        .reverse();
      setAvailableFYs(fys as string[]);
      if (fys.length > 0 && !fys.includes(getCurrentFY()))
        setSelectedFY(fys[0] as string);
    } catch {
      setToast({ msg: "Failed to load purchases", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: number) {
    if (!confirm("Cancel this purchase?")) return;
    try {
      await fetch(`${API}/purchases/${id}/cancel`, { method: "PATCH" });
      setToast({ msg: "Purchase cancelled", type: "success" });
      load();
    } catch {
      setToast({ msg: "Failed to cancel", type: "error" });
    }
  }

  const filtered = purchases.filter(
    (p) =>
      p.financialYear === selectedFY &&
      (String(p.purchaseNo).toLowerCase().includes(search.toLowerCase()) ||
        p.supplier.name.toLowerCase().includes(search.toLowerCase())),
  );
  const totalAmt = filtered.reduce((s, p) => s + p.grandTotal, 0);
  const fys = [...new Set([getCurrentFY(), ...availableFYs])].sort().reverse();

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
        title="All Purchases"
        subtitle={`${filtered.length} purchases · ₹${fmt(totalAmt)}`}
        actions={
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search purchase or supplier..."
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 outline-none focus:border-blue-500"
            />
            <Link to="/purchases/new">
              <Button>+ New Purchase</Button>
            </Link>
          </>
        }
      />
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {fys.map((fy) => (
          <button
            key={fy}
            onClick={() => setSelectedFY(fy)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${selectedFY === fy ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300"}`}
          >
            FY {fy}
            {fy === getCurrentFY() && (
              <span className="ml-1 text-xs opacity-75">(Current)</span>
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
              title="No purchases found"
              action={
                <Link to="/purchases/new">
                  <Button>+ New Purchase</Button>
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    {[
                      "Purchase No",
                      "Date",
                      "Supplier",
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
                  {filtered.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-50 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-blue-700 text-sm">
                        #{p.purchaseNo}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {new Date(p.purchaseDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        {p.supplier.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        ₹{fmt(p.totalTaxable)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        ₹{fmt(p.totalTax)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-800">
                        ₹{fmt(p.grandTotal)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={p.status === "SAVED" ? "green" : "red"}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Link to={`/purchases/${p.id}/return`}>
                            <Button variant="ghost" size="sm">
                              Return
                            </Button>
                          </Link>
                          {p.status === "SAVED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancel(p.id)}
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
        </Card>
      )}
    </div>
  );
}
