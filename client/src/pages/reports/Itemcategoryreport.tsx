import { useEffect, useState } from "react";
import { fmt } from "../../utils/invoice.utils";
import { Card, PageHeader, LoadingScreen, Input } from "../../components/ui";
import api from "../../utils/api";

const CATEGORIES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface ItemRow {
  id: number;
  name: string;
  hsnCode: string;
  unit: string;
  prices: { category: string; price: number }[];
}

export default function ItemCategoryReport() {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{
    itemId: number;
    category: string;
    price: string;
  } | null>(null);
  const [visibleCats, setVisibleCats] = useState<string[]>([
    "A",
    "B",
    "C",
    "D",
    "E",
  ]);

  useEffect(() => {
    load();
  }, [search]);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get("/category-prices/item-report", {
        params: { search },
      });
      setItems(r.data.items);
    } finally {
      setLoading(false);
    }
  }

  async function savePrice() {
    if (!editing) return;
    await api.post(`/category-prices/item/${editing.itemId}`, {
      prices: [
        { category: editing.category, price: parseFloat(editing.price) || 0 },
      ],
    });
    setEditing(null);
    load();
  }

  const exportCSV = () => {
    const header = [
      "Item Name",
      "HSN",
      "Unit",
      ...CATEGORIES.map((c) => `Cat ${c}`),
    ];
    const rows = items.map((item) => [
      item.name,
      item.hsnCode,
      item.unit,
      ...CATEGORIES.map(
        (c) => item.prices.find((p) => p.category === c)?.price || 0,
      ),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${v}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "item-category-prices.csv";
    a.click();
  };

  return (
    <div>
      <PageHeader
        title="Item Category Prices"
        subtitle="Item-wise rates for each customer category A–Z"
      />

      {/* Category selector */}
      <Card className="p-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-600">
            Show categories:
          </span>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() =>
                setVisibleCats((v) =>
                  v.includes(c) ? v.filter((x) => x !== c) : [...v, c].sort(),
                )
              }
              className={`w-8 h-8 rounded-full text-sm font-bold border ${visibleCats.includes(c) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-300"}`}
            >
              {c}
            </button>
          ))}
          <button
            onClick={() => setVisibleCats([...CATEGORIES])}
            className="text-xs text-blue-600 hover:underline ml-2"
          >
            All
          </button>
          <button
            onClick={() => setVisibleCats([])}
            className="text-xs text-slate-500 hover:underline"
          >
            None
          </button>
        </div>
      </Card>

      <Card>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <Input
            placeholder="Search item..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            className="w-72"
          />
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 text-xs font-semibold border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 whitespace-nowrap"
          >
            ⬇ CSV
          </button>
        </div>
        {loading ? (
          <LoadingScreen />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 sticky left-0 bg-slate-50 min-w-[220px]">
                    Item Name
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">
                    HSN
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">
                    Unit
                  </th>
                  {visibleCats.map((c) => (
                    <th
                      key={c}
                      className="text-right text-xs font-semibold text-slate-600 px-4 py-3 min-w-[80px]"
                    >
                      Cat {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-50 hover:bg-slate-50"
                  >
                    <td className="px-4 py-2.5 text-sm font-medium text-slate-800 sticky left-0 bg-white">
                      {item.name}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {item.hsnCode}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {item.unit}
                    </td>
                    {visibleCats.map((cat) => {
                      const p = item.prices.find((x) => x.category === cat);
                      const isEditing =
                        editing?.itemId === item.id && editing.category === cat;
                      return (
                        <td key={cat} className="px-2 py-2 num">
                          {isEditing ? (
                            <div className="flex gap-1 items-center">
                              <input
                                autoFocus
                                type="number"
                                value={editing.price}
                                onChange={(e) =>
                                  setEditing({
                                    ...editing,
                                    price: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") savePrice();
                                  if (e.key === "Escape") setEditing(null);
                                }}
                                aria-label={`Category ${cat} rate for ${item.name}`}
                                className="w-20 border rounded px-1 py-1 text-sm text-right"
                              />
                              <button
                                onClick={savePrice}
                                aria-label="Save rate"
                                className="w-7 h-7 text-sm text-blue-700"
                              >
                                ✓
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                setEditing({
                                  itemId: item.id,
                                  category: cat,
                                  price: String(p?.price || ""),
                                })
                              }
                              aria-label={`Edit category ${cat} rate for ${item.name}`}
                              className={`text-sm px-2 min-h-[30px] rounded w-full text-right hover:bg-blue-50 ${p?.price ? "text-slate-800 font-medium" : "text-slate-500"}`}
                            >
                              {p?.price ? `₹${fmt(p.price)}` : "-"}
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={3 + visibleCats.length}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      No items found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5 py-3 border-t text-xs text-slate-400">
          Click any price cell to edit • Press Enter to save • Esc to cancel
        </div>
      </Card>
    </div>
  );
}
