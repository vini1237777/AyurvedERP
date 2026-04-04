import { useState, useEffect } from "react";
import { itemApi, hsnApi } from "../../utils/api";
import api from "../../utils/api";
import {
  Button,
  Modal,
  PageHeader,
  Card,
  Badge,
  EmptyState,
  LoadingScreen,
  Toast,
  Input,
  Select,
} from "../../components/ui";
import { Pagination, usePagination } from "../../components/ui/Pagination";
import type { Item, HsnCode, TaxSlab, ItemFormData } from "../../types";

const UNITS = [
  { value: "Pcs", label: "Pcs" },
  { value: "Box", label: "Box" },
  { value: "Strip", label: "Strip" },
  { value: "Kgs", label: "Kgs" },
  { value: "Liter", label: "Liter" },
  { value: "ML", label: "ML" },
];

const CATEGORIES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const EMPTY_CAT_PRICES = Object.fromEntries(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((c) => [c, ""]),
);

const EMPTY: ItemFormData = {
  name: "",
  shortName: "",
  hsnId: "",
  taxSlabId: "",
  unit: "Pcs",
  altUnit: "",
  altFactor: "1",
  maintainBatch: true,
  mrp: "",
  rate: "",
};

export default function ItemMaster() {
  const [items, setItems] = useState<Item[]>([]);
  const [hsnList, setHsnList] = useState<HsnCode[]>([]);
  const [slabs, setSlabs] = useState<TaxSlab[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [catModal, setCatModal] = useState<Item | null>(null);
  const [catPrices, setCatPrices] = useState<Record<string, string>>({});
  const [catSaving, setCatSaving] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState<ItemFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<ItemFormData>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (!form.hsnId || !hsnList.length || !slabs.length) return;
    const hsn = hsnList.find((h) => String(h.id) === form.hsnId);
    if (!hsn) return;
    const match = slabs.find((s) => s.rate === hsn.gstRate);
    if (match) setForm((p) => ({ ...p, taxSlabId: String(match.id) }));
  }, [form.hsnId]);

  const selectedHsn = hsnList.find((h) => String(h.id) === form.hsnId);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [itemsData, hsnData, slabData] = await Promise.all([
        itemApi.getAll(),
        hsnApi.getAll(),
        hsnApi.getTaxSlabs(),
      ]);
      setItems(itemsData);
      setHsnList(hsnData);
      setSlabs(slabData);
    } catch {
      setToast({ msg: "Failed to load", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setCatPrices({ ...EMPTY_CAT_PRICES });
    setModal(true);
  }
  async function openEdit(item: Item) {
    setEditing(item);
    setForm({
      name: item.name,
      shortName: item.shortName || "",
      hsnId: String(item.hsnId),
      taxSlabId: String(item.taxSlabId),
      unit: item.unit,
      altUnit: item.altUnit || "",
      altFactor: String(item.altFactor),
      maintainBatch: item.maintainBatch,
      mrp: item.mrp != null ? String(item.mrp) : "",
      rate: item.rate != null ? String(item.rate) : "",
    });
    setErrors({});
    // Load existing category prices for this item
    const prices: Record<string, string> = { ...EMPTY_CAT_PRICES };
    try {
      const res = await api.get(`/category-prices/item/${item.id}`);
      (res.data as any[]).forEach((p: any) => {
        if (p.price > 0) prices[p.category] = String(p.price);
      });
    } catch {}
    setCatPrices(prices);
    setModal(true);
  }

  async function openCatPrices(item: Item) {
    setCatModal(item);
    const prices: Record<string, string> = {};
    CATEGORIES.forEach((c) => {
      prices[c] = "";
    });
    try {
      const res = await api.get(`/category-prices/item/${item.id}`);
      (res.data as any[]).forEach((p: any) => {
        if (p.price > 0) prices[p.category] = String(p.price);
      });
    } catch {}
    setCatPrices(prices);
  }

  async function saveCatPrices() {
    if (!catModal) return;
    setCatSaving(true);
    try {
      const pricesArr = CATEGORIES.filter(
        (c) => catPrices[c] && parseFloat(catPrices[c]) > 0,
      ).map((c) => ({ category: c, price: parseFloat(catPrices[c]) }));
      await api.post(`/category-prices/item/${catModal.id}`, {
        prices: pricesArr,
      });
      setToast({ msg: "Category prices saved", type: "success" });
      setCatModal(null);
      load();
    } catch {
      setToast({ msg: "Failed to save", type: "error" });
    } finally {
      setCatSaving(false);
    }
  }

  function validate(): boolean {
    const e: Partial<ItemFormData> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.hsnId) e.hsnId = "Select HSN code";
    if (!form.taxSlabId) e.taxSlabId = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const saved = editing
        ? await itemApi.update(editing.id, form)
        : await itemApi.create(form);
      const itemId = editing?.id ?? saved?.id;
      if (itemId) {
        const pricesArr = CATEGORIES.filter(
          (c) => catPrices[c] && parseFloat(catPrices[c]) > 0,
        ).map((c) => ({ category: c, price: parseFloat(catPrices[c]) }));
        if (pricesArr.length > 0) {
          await api.post(`/category-prices/item/${itemId}`, {
            prices: pricesArr,
          });
        }
      }
      setToast({
        msg: editing ? "Item updated" : "Item created",
        type: "success",
      });
      setModal(false);
      load();
    } catch (err: any) {
      setToast({ msg: err.response?.data?.error || "Failed", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this item?")) return;
    try {
      await itemApi.delete(id);
      setToast({ msg: "Item deleted", type: "success" });
      load();
    } catch {
      setToast({ msg: "Failed to delete", type: "error" });
    }
  }

  // Alphabetical sort (already from server, but ensure)
  const filtered = [...items]
    .filter(
      (i) =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.hsn.code.includes(search),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const pg = usePagination(filtered, 50);

  useEffect(() => {
    pg.reset();
  }, [search]);

  const fmtR = (n?: number | null) => (n != null ? `₹${n.toFixed(2)}` : "-");

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
        title="Items"
        subtitle={`${items.length} total items`}
        actions={
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search item or HSN..."
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 outline-none focus:border-blue-500"
            />
            <Button onClick={openCreate}>+ New Item</Button>
          </>
        }
      />
      {loading ? (
        <LoadingScreen />
      ) : (
        <Card>
          {filtered.length === 0 ? (
            <EmptyState
              title="No items found"
              action={<Button onClick={openCreate}>+ New Item</Button>}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {[
                        "Item Name",
                        "HSN Code",
                        "GST %",
                        "MRP",
                        "Rate",
                        "Category Prices",
                        "Unit",
                        "Batch",
                        "Batches",
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
                    {pg.paginated.map((item) => {
                      const catPricesSet =
                        (item as any).categoryPrices?.filter(
                          (p: any) => p.price > 0,
                        ) || [];
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-slate-50 hover:bg-slate-50"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-sm text-slate-800">
                              {item.name}
                            </div>
                            {item.shortName && (
                              <div className="text-xs text-slate-500">
                                {item.shortName}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge color="blue">{item.hsn.code}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              color={
                                item.taxSlab.rate === 0
                                  ? "gray"
                                  : item.taxSlab.rate <= 5
                                    ? "green"
                                    : "yellow"
                              }
                            >
                              {item.taxSlab.rate}%
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                            {fmtR(item.mrp)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                            {fmtR(item.rate)}
                          </td>
                          <td className="px-4 py-3">
                            {catPricesSet.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {catPricesSet.slice(0, 4).map((p: any) => (
                                  <span
                                    key={p.category}
                                    className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium"
                                  >
                                    {p.category}:₹{p.price}
                                  </span>
                                ))}
                                {catPricesSet.length > 4 && (
                                  <span className="text-xs text-slate-400">
                                    +{catPricesSet.length - 4} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {item.unit}
                          </td>
                          <td className="px-4 py-3">
                            {item.maintainBatch ? (
                              <Badge color="blue">Yes</Badge>
                            ) : (
                              <Badge color="gray">No</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold text-slate-700">
                              {item.batches.length}
                            </span>
                            <span className="text-xs text-slate-400 ml-1">
                              batches
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(item)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openCatPrices(item)}
                                className="text-blue-600"
                              >
                                Prices
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(item.id)}
                                className="text-red-500"
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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

      {/* Item Create/Edit Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Edit Item" : "New Item"}
        width="max-w-xl"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input
              label="Item Name *"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              error={errors.name}
              placeholder="Full item name"
            />
          </div>
          <Input
            label="Short Name"
            value={form.shortName}
            onChange={(e) =>
              setForm((p) => ({ ...p, shortName: e.target.value }))
            }
            placeholder="Optional short name"
          />
          <div>
            <Select
              label="HSN Code *"
              value={form.hsnId}
              onChange={(e) =>
                setForm((p) => ({ ...p, hsnId: e.target.value }))
              }
              options={[
                { value: "", label: "-- Select HSN Code --" },
                ...hsnList.map((h) => ({
                  value: String(h.id),
                  label: `${h.code} — ${h.description || "Ayurvedic"} (${h.gstRate}%)`,
                })),
              ]}
              error={errors.hsnId}
            />
            {selectedHsn && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-xs text-emerald-600 font-medium">
                  ✓ GST auto-set: {selectedHsn.gstRate}%
                </span>
                <span className="text-xs text-slate-400">(from HSN)</span>
              </div>
            )}
          </div>
          <Input
            label="MRP (₹)"
            value={form.mrp}
            type="number"
            onChange={(e) => setForm((p) => ({ ...p, mrp: e.target.value }))}
            placeholder="e.g. 150.00"
          />
          <Input
            label="Sale Rate (₹)"
            value={form.rate}
            type="number"
            onChange={(e) => setForm((p) => ({ ...p, rate: e.target.value }))}
            placeholder="e.g. 120.00"
          />
          <Select
            label="Primary Unit"
            value={form.unit}
            onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
            options={UNITS}
          />
          <Select
            label="Alt Unit"
            value={form.altUnit}
            onChange={(e) =>
              setForm((p) => ({ ...p, altUnit: e.target.value }))
            }
            options={[{ value: "", label: "None" }, ...UNITS]}
          />
          <Input
            label={
              form.altUnit
                ? `Alt Factor (1 ${form.altUnit} = ? ${form.unit})`
                : "Alt Factor"
            }
            value={form.altFactor}
            onChange={(e) =>
              setForm((p) => ({ ...p, altFactor: e.target.value }))
            }
            type="number"
            placeholder="e.g. 30"
          />
          <div className="col-span-2 flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="batch"
              checked={form.maintainBatch}
              onChange={(e) =>
                setForm((p) => ({ ...p, maintainBatch: e.target.checked }))
              }
              className="w-4 h-4 rounded accent-blue-600"
            />
            <label
              htmlFor="batch"
              className="text-sm text-slate-700 cursor-pointer"
            >
              Maintain Batch-wise stock
            </label>
            <span className="text-xs text-slate-400">
              (recommended for medicines)
            </span>
          </div>
          {selectedHsn && (
            <div className="col-span-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <div className="text-xs font-semibold text-blue-700 mb-1">
                Tax Details (Auto from HSN)
              </div>
              <div className="flex gap-6 text-xs text-slate-600">
                <span>
                  HSN: <b className="text-slate-800">{selectedHsn.code}</b>
                </span>
                <span>
                  GST Rate:{" "}
                  <b className="text-slate-800">{selectedHsn.gstRate}%</b>
                </span>
                <span>
                  CGST:{" "}
                  <b className="text-slate-800">{selectedHsn.gstRate / 2}%</b>
                </span>
                <span>
                  SGST:{" "}
                  <b className="text-slate-800">{selectedHsn.gstRate / 2}%</b>
                </span>
              </div>
            </div>
          )}
        </div>
        {/* Category Prices inline */}
        <div className="col-span-2 mt-9">
          <div className="text-xs font-semibold text-slate-600 mb-2">
            Category Prices (A–Z) — optional
          </div>
          <div className="grid grid-cols-6 gap-2">
            {CATEGORIES.map((cat) => (
              <div key={cat}>
                <label className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                    {cat}
                  </span>
                </label>
                <input
                  type="number"
                  value={catPrices[cat] || ""}
                  placeholder="—"
                  onChange={(e) =>
                    setCatPrices((p) => ({ ...p, [cat]: e.target.value }))
                  }
                  className="border border-slate-200 rounded-lg px-1 py-1 text-xs w-full outline-none focus:border-blue-500 text-center"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={() => setModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {editing ? "Update" : "Create"} Item
          </Button>
        </div>
      </Modal>

      {/* Category Prices Modal */}
      <Modal
        open={!!catModal}
        onClose={() => setCatModal(null)}
        title={`Category Prices — ${catModal?.name || ""}`}
        width="max-w-lg"
      >
        <p className="text-xs text-slate-500 mb-4">
          Set sale rate for each customer category. Leave blank if not
          applicable.
        </p>
        <div className="grid grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-1">
          {CATEGORIES.map((cat) => (
            <div key={cat}>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold mr-1">
                  {cat}
                </span>
                Rate (₹)
              </label>
              <input
                type="number"
                value={catPrices[cat] || ""}
                placeholder="—"
                onChange={(e) =>
                  setCatPrices((p) => ({ ...p, [cat]: e.target.value }))
                }
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm w-full outline-none focus:border-blue-500 text-center"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={() => setCatModal(null)}>
            Cancel
          </Button>
          <Button onClick={saveCatPrices} loading={catSaving}>
            Save Prices
          </Button>
        </div>
      </Modal>
    </div>
  );
}
