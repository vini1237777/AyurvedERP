import { useEffect, useState } from "react";
import { Card, PageHeader, LoadingScreen } from "../../components/ui";
import api from "../../utils/api";

const CATEGORIES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface Customer {
  id: number;
  name: string;
  mobile?: string;
  city?: string;
  gstin?: string;
  category?: string;
}

export default function CustomerCategoryReport() {
  const [data, setData] = useState<Record<string, Customer[]>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("ALL");
  const [editId, setEditId] = useState<number | null>(null);
  const [editCat, setEditCat] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get("/category-prices/customer-report");
      setData(r.data);
    } finally {
      setLoading(false);
    }
  }

  async function saveCategory(id: number) {
    await api.patch(`/category-prices/customer/${id}/category`, {
      category: editCat,
    });
    setEditId(null);
    load();
  }

  const totalCustomers = Object.values(data).reduce((s, a) => s + a.length, 0);

  const exportCSV = () => {
    const rows = [["Category", "Customer Name", "City", "Mobile", "GSTIN"]];
    Object.entries(data)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([cat, custs]) =>
        custs.forEach((c) =>
          rows.push([cat, c.name, c.city || "", c.mobile || "", c.gstin || ""]),
        ),
      );
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "customer-category-report.csv";
    a.click();
  };

  return (
    <div>
      <PageHeader
        title="Customer Category Report"
        subtitle="Customers grouped by price category A–Z"
      />
      <div className="grid grid-cols-9 gap-2 mb-4">
        {CATEGORIES.slice(0, 8).map((cat) => (
          <Card
            key={cat}
            className={`p-3 text-center cursor-pointer ${selected === cat ? "ring-2 ring-blue-500" : ""}`}
            onClick={() => setSelected(selected === cat ? "ALL" : cat)}
          >
            <div className="text-lg font-bold text-blue-700">{cat}</div>
            <div className="text-xs text-slate-500">
              {data[cat]?.length || 0}
            </div>
          </Card>
        ))}
        <Card className="p-3 text-center bg-slate-50">
          <div className="text-lg font-bold text-slate-700">
            {totalCustomers}
          </div>
          <div className="text-xs text-slate-500">Total</div>
        </Card>
      </div>
      <Card>
        {loading ? (
          <LoadingScreen />
        ) : (
          <>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-semibold">Customers</span>
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      Category {c} ({data[c]?.length || 0})
                    </option>
                  ))}
                  <option value="Unassigned">
                    Unassigned ({data["Unassigned"]?.length || 0})
                  </option>
                </select>
              </div>
              <button
                onClick={exportCSV}
                className="px-3 py-1.5 text-xs font-semibold border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100"
              >
                ⬇ CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    {[
                      "Category",
                      "Customer Name",
                      "City",
                      "Mobile",
                      "GSTIN",
                      "Action",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-semibold text-slate-500 px-4 py-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data)
                    .filter(([cat]) => selected === "ALL" || cat === selected)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .flatMap(([cat, custs]) =>
                      custs.map((c) => (
                        <tr
                          key={c.id}
                          className="border-b border-slate-50 hover:bg-slate-50"
                        >
                          <td className="px-4 py-2.5">
                            {editId === c.id ? (
                              <select
                                value={editCat}
                                onChange={(e) => setEditCat(e.target.value)}
                                className="border rounded px-2 py-1 text-sm"
                              >
                                <option value="">None</option>
                                {CATEGORIES.map((x) => (
                                  <option key={x} value={x}>
                                    {x}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                                {cat === "Unassigned" ? "?" : cat}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-sm font-medium text-slate-800">
                            {c.name}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-slate-600">
                            {c.city || "-"}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-slate-600">
                            {c.mobile || "-"}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500">
                            {c.gstin || "-"}
                          </td>
                          <td className="px-4 py-2.5">
                            {editId === c.id ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => saveCategory(c.id)}
                                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditId(null)}
                                  className="text-xs px-2 py-1 border rounded"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditId(c.id);
                                  setEditCat(c.category || "");
                                }}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      )),
                    )}
                  {Object.keys(data).length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-sm text-slate-500"
                      >
                        No customers with category assigned yet
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
