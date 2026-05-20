import { useEffect, useState } from "react";
import { companyApi } from "../../utils/api";
import { validateGstin } from "../../utils/invoice.utils";
import {
  Button,
  PageHeader,
  Card,
  LoadingScreen,
  Toast,
  Input,
  Select,
} from "../../components/ui";
import type { CompanyFormData } from "../../types";

const STATES = [
  { value: "27", label: "27 - Maharashtra" },
  { value: "29", label: "29 - Karnataka" },
  { value: "07", label: "07 - Delhi" },
  { value: "09", label: "09 - Uttar Pradesh" },
  { value: "33", label: "33 - Tamil Nadu" },
  { value: "06", label: "06 - Haryana" },
  { value: "24", label: "24 - Gujarat" },
];

const STATE_NAME: Record<string, string> = {
  "27": "Maharashtra",
  "29": "Karnataka",
  "07": "Delhi",
  "09": "Uttar Pradesh",
  "33": "Tamil Nadu",
  "06": "Haryana",
  "24": "Gujarat",
};

const EMPTY: CompanyFormData = {
  name: "",
  address: "",
  mobile: "",
  gstin: "",
  pan: "",
  stateCode: "27",
  state: "Maharashtra",
  bank: "",
  ifsc: "",
  account: "",
};

export default function CompanyProfile() {
  const [form, setForm] = useState<CompanyFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<CompanyFormData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    companyApi
      .get()
      .then((c) => {
        if (c) {
          setForm({
            name: c.name || "",
            address: c.address || "",
            mobile: c.mobile || "",
            gstin: c.gstin || "",
            pan: c.pan || "",
            stateCode: c.stateCode || "27",
            state: c.state || "Maharashtra",
            bank: c.bank || "",
            ifsc: c.ifsc || "",
            account: c.account || "",
          });
        }
      })
      .catch(() => setToast({ msg: "Failed to load profile", type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof CompanyFormData>(k: K, v: CompanyFormData[K]) {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<CompanyFormData> = {};
    if (!form.name.trim()) next.name = "Company name is required";
    if (form.gstin && !validateGstin(form.gstin).valid)
      next.gstin = "Invalid GSTIN format";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    try {
      await companyApi.save(form);
      setToast({ msg: "Profile saved", type: "success" });
    } catch {
      setToast({ msg: "Failed to save", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <>
      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <PageHeader
        title="Company Profile"
        subtitle="Your business identity — used on invoices, reports and the topbar."
        actions={
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        }
      />

      <Card>
        <div className="p-5 space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              Identity
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Company Name *"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                error={errors.name}
                placeholder="Aushadhi Wellness Pvt Ltd"
              />
              <Input
                label="Mobile"
                value={form.mobile}
                onChange={(e) => update("mobile", e.target.value)}
                placeholder="9876543210"
              />
              <div className="col-span-2">
                <Input
                  label="Address"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="Building, Street, City, PIN"
                />
              </div>
              <Select
                label="State"
                value={form.stateCode}
                onChange={(e) => {
                  const code = e.target.value;
                  update("stateCode", code);
                  update("state", STATE_NAME[code] || form.state);
                }}
                options={STATES}
              />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              Tax Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="GSTIN"
                value={form.gstin}
                onChange={(e) => update("gstin", e.target.value.toUpperCase())}
                error={errors.gstin}
                placeholder="27AAAAA0000A1Z5"
              />
              <Input
                label="PAN"
                value={form.pan}
                onChange={(e) => update("pan", e.target.value.toUpperCase())}
                placeholder="AAAAA0000A"
              />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              Bank Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Bank Name & Branch"
                value={form.bank}
                onChange={(e) => update("bank", e.target.value)}
                placeholder="HDFC BANK, PUNE"
              />
              <Input
                label="IFSC"
                value={form.ifsc}
                onChange={(e) => update("ifsc", e.target.value.toUpperCase())}
                placeholder="HDFC0001234"
              />
              <div className="col-span-2">
                <Input
                  label="Account Number"
                  value={form.account}
                  onChange={(e) => update("account", e.target.value)}
                  placeholder="50100123456789"
                />
              </div>
            </div>
          </section>
        </div>
      </Card>
    </>
  );
}
