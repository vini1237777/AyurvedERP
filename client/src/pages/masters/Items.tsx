import { useState, useEffect } from "react";
import { itemApi, hsnApi } from "../../utils/api";
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
import type { Item, HsnCode, TaxSlab, ItemFormData } from "../../types";

const UNITS = [
  { value: "Pcs", label: "Pcs" },
  { value: "Box", label: "Box" },
  { value: "Strip", label: "Strip" },
  { value: "Kgs", label: "Kgs" },
  { value: "Liter", label: "Liter" },
  { value: "ML", label: "ML" },
];

const EMPTY: ItemFormData = {
  name: "",
  shortName: "",
  hsnId: "",
  taxSlabId: "",
  unit: "Pcs",
  altUnit: "",
  altFactor: "1",
  maintainBatch: true,
};

export default function ItemMaster() {
  const [items, setItems] = useState<Item[]>([]);
  const [hsnList, setHsnList] = useState<HsnCode[]>([]);
  const [slabs, setSlabs] = useState<TaxSlab[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState<ItemFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<ItemFormData>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // When HSN selected → auto-fill Tax Slab from HSN GST rate
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
    setModal(true);
  }
  function openEdit(item: Item) {
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
    });
    setErrors({});
    setModal(true);
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
      if (editing) {
        await itemApi.update(editing.id, form);
        setToast({ msg: "Item updated", type: "success" });
      } else {
        await itemApi.create(form);
        setToast({ msg: "Item created", type: "success" });
      }
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

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.hsn.code.includes(search),
  );

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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {[
                      "Item Name",
                      "HSN Code",
                      "GST %",
                      "Unit",
                      "Alt Unit",
                      "Batch",
                      "Batches",
                      "Actions",
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
                  {filtered.map((item) => (
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
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {item.unit}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {item.altUnit || "-"}{" "}
                        {item.altUnit && `(x${item.altFactor})`}
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
                        <div className="flex gap-2">
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
                            onClick={() => handleDelete(item.id)}
                            className="text-red-500"
                          >
                            Delete
                          </Button>
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

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Edit Item" : "New Item"}
        width="max-w-xl"
      >
        <div className="grid grid-cols-2 gap-4">
          {/* Item Name */}
          <div className="col-span-2">
            <Input
              label="Item Name *"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              error={errors.name}
              placeholder="Full item name"
            />
          </div>

          {/* Short Name */}
          <Input
            label="Short Name"
            value={form.shortName}
            onChange={(e) =>
              setForm((p) => ({ ...p, shortName: e.target.value }))
            }
            placeholder="Optional short name"
          />

          {/* HSN Code — auto fills GST */}
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
            {/* GST auto-fill indicator */}
            {selectedHsn && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-xs text-emerald-600 font-medium">
                  ✓ GST auto-set: {selectedHsn.gstRate}%
                </span>
                <span className="text-xs text-slate-400">(from HSN)</span>
              </div>
            )}
          </div>

          {/* Primary Unit */}
          <Select
            label="Primary Unit"
            value={form.unit}
            onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
            options={UNITS}
          />

          {/* Alt Unit */}
          <Select
            label="Alt Unit"
            value={form.altUnit}
            onChange={(e) =>
              setForm((p) => ({ ...p, altUnit: e.target.value }))
            }
            options={[{ value: "", label: "None" }, ...UNITS]}
          />

          {/* Alt Factor */}
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

          {/* Maintain Batch */}
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

          {/* GST Summary (read-only info) */}
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

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={() => setModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {editing ? "Update" : "Create"} Item
          </Button>
        </div>
      </Modal>
    </div>
  );
}
