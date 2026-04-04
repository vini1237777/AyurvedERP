import { useState, useEffect } from "react";
import { customerApi } from "../../utils/api";
import { validateGstin } from "../../utils/invoice.utils";
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
import type { Customer, CustomerFormData } from "../../types";

const STATES = [
  { value: "27", label: "27 - Maharashtra" },
  { value: "29", label: "29 - Karnataka" },
  { value: "07", label: "07 - Delhi" },
  { value: "09", label: "09 - Uttar Pradesh" },
  { value: "33", label: "33 - Tamil Nadu" },
  { value: "06", label: "06 - Haryana" },
  { value: "24", label: "24 - Gujarat" },
];

const EMPTY: CustomerFormData = {
  name: "",
  gstin: "",
  pan: "",
  dlNo: "",
  state: "Maharashtra",
  stateCode: "27",
  address: "",
  city: "",
  pincode: "",
  mobile: "",
  phone: "",
  email: "",
};

export default function CustomerMaster() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<CustomerFormData>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setCustomers(await customerApi.getAll());
    } catch {
      setToast({ msg: "Failed to load customers", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.gstin || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.mobile || "").includes(search),
  );

  const pg = usePagination(filtered, 50);

  // Reset page when search changes
  useEffect(() => {
    pg.reset();
  }, [search]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setModal(true);
  }
  function openEdit(c: Customer) {
    setEditing(c);
    setForm({
      name: c.name,
      gstin: c.gstin || "",
      pan: c.pan || "",
      dlNo: c.dlNo || "",
      state: c.state,
      stateCode: c.stateCode,
      address: c.address || "",
      city: c.city || "",
      pincode: c.pincode || "",
      mobile: c.mobile || "",
      phone: c.phone || "",
      email: c.email || "",
    });
    setErrors({});
    setModal(true);
  }

  function validate(): boolean {
    const e: Partial<CustomerFormData> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (form.gstin) {
      const v = validateGstin(form.gstin.toUpperCase());
      if (!v.valid) e.gstin = v.error;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const data: any = {
        ...form,
        gstin: form.gstin.toUpperCase() || undefined,
      };
      if (editing) {
        await customerApi.update(editing.id, data);
        setToast({ msg: "Customer updated", type: "success" });
      } else {
        await customerApi.create(data);
        setToast({ msg: "Customer created", type: "success" });
      }
      setModal(false);
      load();
    } catch (err: any) {
      setToast({
        msg: err.response?.data?.error || "Failed to save",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this customer?")) return;
    try {
      await customerApi.delete(id);
      setToast({ msg: "Customer deleted", type: "success" });
      load();
    } catch {
      setToast({ msg: "Failed to delete", type: "error" });
    }
  }

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
        title="Customers"
        subtitle={`${customers.length} total customers`}
        actions={
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, GSTIN, mobile..."
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 outline-none focus:border-blue-500"
            />
            <Button onClick={openCreate}>+ New Customer</Button>
          </>
        }
      />

      {loading ? (
        <LoadingScreen />
      ) : (
        <Card>
          {filtered.length === 0 ? (
            <EmptyState
              title="No customers found"
              subtitle="Add your first customer to get started"
              action={<Button onClick={openCreate}>+ New Customer</Button>}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {[
                        "Name",
                        "GSTIN",
                        "State",
                        "Mobile",
                        "Balance",
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
                    {pg.paginated.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-sm text-slate-800">
                            {c.name}
                          </div>
                          {c.address && (
                            <div className="text-xs text-slate-500">
                              {c.address}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {c.gstin ? (
                            <Badge color="green">{c.gstin}</Badge>
                          ) : (
                            <Badge color="gray">No GSTIN</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {c.state} ({c.stateCode})
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {c.mobile || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-sm font-semibold ${c.balance < 0 ? "text-red-600" : "text-emerald-600"}`}
                          >
                            ₹{Math.abs(c.balance).toLocaleString("en-IN")}{" "}
                            {c.balance < 0 ? "Dr." : "Cr."}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(c)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(c.id)}
                              className="text-red-500 hover:text-red-700"
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
        title={editing ? "Edit Customer" : "New Customer"}
        width="max-w-2xl"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input
              label="Customer Name *"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              error={errors.name}
              placeholder="Full name or business name"
            />
          </div>
          <Input
            label="GSTIN"
            value={form.gstin}
            onChange={(e) =>
              setForm((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))
            }
            error={errors.gstin}
            placeholder="27XXXXX1234X1Z1"
            maxLength={15}
          />
          <Input
            label="PAN"
            value={form.pan}
            onChange={(e) =>
              setForm((p) => ({ ...p, pan: e.target.value.toUpperCase() }))
            }
            placeholder="XXXXX1234X"
            maxLength={10}
          />
          <Input
            label="DL No."
            value={form.dlNo}
            onChange={(e) => setForm((p) => ({ ...p, dlNo: e.target.value }))}
            placeholder="Drug License No."
          />
          <Select
            label="State"
            value={form.stateCode}
            onChange={(e) => {
              const s = STATES.find((x) => x.value === e.target.value);
              setForm((p) => ({
                ...p,
                stateCode: e.target.value,
                state: s?.label.split(" - ")[1] || "",
              }));
            }}
            options={STATES}
          />
          <div className="col-span-2">
            <Input
              label="Address"
              value={form.address}
              onChange={(e) =>
                setForm((p) => ({ ...p, address: e.target.value }))
              }
              placeholder="Street address"
            />
          </div>
          <Input
            label="City"
            value={form.city}
            onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
          />
          <Input
            label="Pincode"
            value={form.pincode}
            onChange={(e) =>
              setForm((p) => ({ ...p, pincode: e.target.value }))
            }
            maxLength={6}
          />
          <Input
            label="Mobile"
            value={form.mobile}
            onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
            placeholder="10-digit mobile"
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          />
          <div className="col-span-2">
            <Input
              label="Email"
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
              type="email"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={() => setModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {editing ? "Update" : "Create"} Customer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
