import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { listKeys, queryClient } from "../../utils/queryClient";
import { thAlign } from "../../components/ui/tableAlign";
import { useSearchParams } from "react-router-dom";
import { batchApi, itemApi } from "../../utils/api";
import { fmt, parseExpiry, fmtExpiry } from "../../utils/invoice.utils";
import {
  Button,
  Modal,
  PageHeader,
  Card,
  EmptyState,
  LoadingScreen,
  Toast,
  Input,
  Select,
  ConfirmDialog,
} from "../../components/ui";
import { Pagination, usePagination } from "../../components/ui/Pagination";
import type { Batch, Item, BatchFormData } from "../../types";

const EMPTY: BatchFormData = {
  itemId: "",
  batchNo: "",
  expiryDate: "",
  mfgDate: "",
  purchasePrice: "",
  salePrice: "",
  mrp: "",
  openingQty: "0",
};

type SortKey = "name" | "batchNo" | "expiry" | "stock" | "price";
type StockFilter = "all" | "full" | "updated" | "low" | "critical" | "out";

type ListFilter = StockFilter | "below10" | "expiring" | "expired";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export default function BatchMaster() {
  const [search, setSearch] = useState("");
  const [searchParams] = useSearchParams();
  // The dashboard links straight to a filtered list.
  const [stockFilter, setStockFilter] = useState<ListFilter>(() => {
    const wanted = searchParams.get("stock");
    return wanted === "expired" || wanted === "expiring" || wanted === "below10"
      ? wanted
      : "all";
  });
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [form, setForm] = useState<BatchFormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const list = useQuery({
    queryKey: listKeys.batches,
    queryFn: () => batchApi.getAll(),
  });
  const batches = (list.data ?? []) as (Batch & { item: Item })[];
  const loading = list.isPending;
  const itemOptions = useQuery({
    queryKey: listKeys.items,
    queryFn: itemApi.getAll,
    enabled: modal,
  });
  const items: Item[] = itemOptions.data ?? [];
  // A batch changes stock, and the item list shows stock.
  const load = () => {
    void queryClient.invalidateQueries({ queryKey: listKeys.batches });
    void queryClient.invalidateQueries({ queryKey: listKeys.items });
  };

  useEffect(() => {
    if (list.isError || itemOptions.isError)
      setToast({ msg: "Failed to load", type: "error" });
  }, [list.isError, itemOptions.isError]);

  // Same rules as the dashboard summary, so its counts match these lists.
  function matchesFilter(b: Batch, filter: ListFilter): boolean {
    if (filter === "all") return true;
    if (filter === "below10") return b.currentQty < 10;
    if (filter === "expired" || filter === "expiring") {
      const expiry = parseExpiry(b.expiryDate);
      if (!expiry || b.currentQty <= 0) return false;
      const left = expiry.getTime() - Date.now();
      return filter === "expired" ? left < 0 : left >= 0 && left <= NINETY_DAYS_MS;
    }
    return stockStatus(b) === filter;
  }

  function stockStatus(b: Batch): StockFilter {
    if (b.currentQty <= 0) return "out";
    if (b.currentQty < b.openingQty * 0.25) return "critical";
    if (b.currentQty < b.openingQty * 0.5) return "low";
    if (b.currentQty < b.openingQty) return "updated";
    return "full";
  }

  // Filter
  const afterSearch = batches.filter(
    (b) =>
      ((b as any).item?.name?.toLowerCase().includes(search.toLowerCase()) ||
        b.batchNo.toLowerCase().includes(search.toLowerCase())) &&
      matchesFilter(b, stockFilter),
  );

  // Sort
  const sorted = [...afterSearch].sort((a, b) => {
    let v = 0;
    if (sortKey === "name")
      v = ((a as any).item?.name || "").localeCompare(
        (b as any).item?.name || "",
      );
    if (sortKey === "batchNo") v = a.batchNo.localeCompare(b.batchNo);
    if (sortKey === "expiry")
      v =
        (parseExpiry(a.expiryDate)?.getTime() ?? Infinity) -
        (parseExpiry(b.expiryDate)?.getTime() ?? Infinity);
    if (sortKey === "stock") v = a.currentQty - b.currentQty;
    if (sortKey === "price") v = (a.salePrice || 0) - (b.salePrice || 0);
    return v * sortDir;
  });

  const pg = usePagination(sorted, 50);
  useEffect(() => {
    pg.reset();
  }, [search, stockFilter, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(k);
      setSortDir(1);
    }
  }

  function SortTh({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <th
        onClick={() => toggleSort(k)}
        className={`${thAlign(label)} text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap cursor-pointer select-none hover:text-slate-700 group`}
      >
        <span className={`flex items-center gap-1 ${thAlign(label) === "text-right" ? "justify-end" : ""}`}>
          {label}
          <span
            className={`transition-opacity ${active ? "opacity-100" : "text-slate-400"}`}
          >
            {active ? (sortDir === 1 ? "↑" : "↓") : "↕"}
          </span>
        </span>
      </th>
    );
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setModal(true);
  }
  function openEdit(b: Batch) {
    setEditing(b);
    setForm({
      itemId: String((b as any).itemId),
      batchNo: b.batchNo,
      expiryDate: b.expiryDate || "",
      mfgDate: b.mfgDate || "",
      purchasePrice: String(b.purchasePrice || ""),
      salePrice: String(b.salePrice || ""),
      mrp: String(b.mrp || ""),
      openingQty: String(b.openingQty),
    });
    setModal(true);
  }

  async function handleSave() {
    if (!form.itemId || !form.batchNo) {
      setToast({ msg: "Item and Batch No required", type: "error" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await batchApi.update(editing.id, form);
        setToast({ msg: "Batch updated", type: "success" });
      } else {
        await batchApi.create(form);
        setToast({ msg: "Batch created", type: "success" });
      }
      setModal(false);
      load();
    } catch (err: any) {
      setToast({ msg: err.response?.data?.error || "Failed", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  const [pendingId, setPendingId] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete(id: number) {
    setConfirming(true);
    try {
      await batchApi.delete(id);
      setToast({ msg: "Deleted", type: "success" });
      load();
    } catch {
      setToast({ msg: "Failed to delete", type: "error" });
    } finally {
      setConfirming(false);
      setPendingId(null);
    }
  }

  function stockBadge(b: Batch) {
    const sold = b.openingQty - b.currentQty,
      status = stockStatus(b);
    const c = {
      out: "bg-red-100 text-red-700 border border-red-200",
      critical: "bg-orange-100 text-orange-700 border border-orange-200",
      low: "bg-yellow-100 text-yellow-700 border border-yellow-200",
      updated: "bg-blue-50 text-blue-700 border border-blue-200",
      full: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      all: "",
    };
    return (
      <div className="flex flex-col gap-0.5">
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block text-center ${c[status]}`}
        >
          {b.currentQty}
        </span>
        {sold > 0 && (
          <span className="text-[10px] text-slate-400 text-center">
            -{sold} sold
          </span>
        )}
        {status === "out" && (
          <span className="text-[10px] text-red-500 font-semibold text-center">
            OUT OF STOCK
          </span>
        )}
      </div>
    );
  }

  function rowBg(b: Batch) {
    const s = stockStatus(b);
    if (s === "out") return "bg-red-50/60 hover:bg-red-50";
    if (s === "critical") return "bg-orange-50/40 hover:bg-orange-50";
    if (s === "updated") return "bg-blue-50/20 hover:bg-blue-50/40";
    return "hover:bg-slate-50";
  }

  const FILTERS: { key: ListFilter; color: string; label: string }[] = [
    {
      key: "all",
      color: "bg-slate-100 text-slate-600 border border-slate-200",
      label: `All (${batches.length})`,
    },
    {
      key: "full",
      color: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      label: `Full Stock (${batches.filter((b) => stockStatus(b) === "full").length})`,
    },
    {
      key: "updated",
      color: "bg-blue-100 text-blue-700 border border-blue-200",
      label: `Partially Sold (${batches.filter((b) => stockStatus(b) === "updated").length})`,
    },
    {
      key: "low",
      color: "bg-yellow-100 text-yellow-700 border border-yellow-200",
      label: `< 50% Left (${batches.filter((b) => stockStatus(b) === "low").length})`,
    },
    {
      key: "critical",
      color: "bg-orange-100 text-orange-700 border border-orange-200",
      label: `< 25% Left (${batches.filter((b) => stockStatus(b) === "critical").length})`,
    },
    {
      key: "out",
      color: "bg-red-100 text-red-700 border border-red-200",
      label: `Out of Stock (${batches.filter((b) => stockStatus(b) === "out").length})`,
    },
    {
      key: "below10",
      color: "bg-white text-slate-700 border border-slate-300",
      label: `Below 10 left (${batches.filter((b) => matchesFilter(b, "below10")).length})`,
    },
    {
      key: "expiring",
      color: "bg-white text-slate-700 border border-slate-300",
      label: `Expiring in 90 days (${batches.filter((b) => matchesFilter(b, "expiring")).length})`,
    },
    {
      key: "expired",
      color: "bg-white text-red-700 border border-red-300",
      label: `Expired (${batches.filter((b) => matchesFilter(b, "expired")).length})`,
    },
  ];

  return (
    <div>
      <ConfirmDialog
        open={pendingId !== null}
        title="Delete this batch?"
        message="It's removed from the batch list. This can't be undone."
        confirmLabel="Delete batch"
        cancelLabel="Keep batch"
        busy={confirming}
        onConfirm={() => pendingId !== null && handleDelete(pendingId)}
        onCancel={() => setPendingId(null)}
      />
      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <PageHeader
        title="Batches & Stock"
        subtitle={`${batches.length} batches`}
        actions={
          <>
            <input
              aria-label="Search item or batch"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search item or batch..."
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 outline-none focus:border-blue-500"
            />
            <Button onClick={openCreate}>+ New Batch</Button>
          </>
        }
      />

      {/* Clickable stock filter pills */}
      <div className="flex items-center gap-2 mb-3 px-1 flex-wrap">
        <span className="text-xs text-slate-400 font-medium">
          Stock Status:
        </span>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStockFilter(f.key)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all border ${f.color} ${stockFilter === f.key ? "ring-2 ring-offset-1 ring-blue-400 scale-105" : ""}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingScreen />
      ) : (
        <Card>
          {sorted.length === 0 ? (
            <EmptyState
              title="No batches found"
              action={
                <Button onClick={() => setStockFilter("all")}>
                  Clear Filter
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <SortTh label="Item" k="name" />
                      <SortTh label="Batch No" k="batchNo" />
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">
                        Mfg Date
                      </th>
                      <SortTh label="Expiry" k="expiry" />
                      <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">
                        Purchase Price
                      </th>
                      <SortTh label="Sale Price" k="price" />
                      <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">
                        MRP
                      </th>
                      <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">
                        Opening Qty
                      </th>
                      <SortTh label="Current Stock" k="stock" />
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 whitespace-nowrap">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pg.paginated.map((b) => (
                      <tr
                        key={b.id}
                        className={`border-b border-slate-50 transition-colors ${rowBg(b)}`}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">
                          {(b as any).item?.name || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-700 whitespace-nowrap">
                          {b.batchNo}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                          {fmtExpiry(b.mfgDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                          {fmtExpiry(b.expiryDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 num">
                          ₹{fmt(b.purchasePrice || 0)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 num">
                          ₹{fmt(b.salePrice || 0)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 num">
                          ₹{fmt(b.mrp || 0)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 num">
                          {b.openingQty}
                        </td>
                        <td className="px-4 py-3 num">{stockBadge(b)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(b)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPendingId(b.id)}
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

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Edit Batch" : "New Batch"}
        width="max-w-xl"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Select
              label="Item *"
              value={form.itemId}
              onChange={(e) =>
                setForm((p) => ({ ...p, itemId: e.target.value }))
              }
              options={[
                {
                  value: "",
                  label: itemOptions.isPending ? "Loading items" : "Select item",
                },
                ...items.map((i) => ({ value: String(i.id), label: i.name })),
              ]}
            />
          </div>
          <Input
            label="Batch No *"
            value={form.batchNo}
            onChange={(e) =>
              setForm((p) => ({ ...p, batchNo: e.target.value }))
            }
            placeholder="e.g. NU01"
          />
          <Input
            label="Expiry Date"
            value={form.expiryDate}
            onChange={(e) =>
              setForm((p) => ({ ...p, expiryDate: e.target.value }))
            }
            placeholder="e.g. 9-2028"
          />
          <Input
            label="Mfg Date"
            value={form.mfgDate}
            onChange={(e) =>
              setForm((p) => ({ ...p, mfgDate: e.target.value }))
            }
            placeholder="e.g. 9-2025"
          />
          <Input
            label="Opening Qty"
            value={form.openingQty}
            onChange={(e) =>
              setForm((p) => ({ ...p, openingQty: e.target.value }))
            }
            type="number"
          />
          <Input
            label="Purchase Price"
            value={form.purchasePrice}
            onChange={(e) =>
              setForm((p) => ({ ...p, purchasePrice: e.target.value }))
            }
            type="number"
            placeholder="0"
          />
          <Input
            label="Sale Price"
            value={form.salePrice}
            onChange={(e) =>
              setForm((p) => ({ ...p, salePrice: e.target.value }))
            }
            type="number"
            placeholder="0"
          />
          <Input
            label="MRP"
            value={form.mrp}
            onChange={(e) => setForm((p) => ({ ...p, mrp: e.target.value }))}
            type="number"
            placeholder="0"
          />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="secondary" onClick={() => setModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {editing ? "Update" : "Create"} Batch
          </Button>
        </div>
      </Modal>
    </div>
  );
}
