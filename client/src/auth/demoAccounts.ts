// Seeded accounts for the public demo, which holds only mock data. These
// passwords are public on purpose. Never add a real account here.
export const DEMO_ROLES: {
  role: "ADMIN" | "SELLER" | "ACCOUNTANT" | "RETAILER";
  email: string;
  password: string;
  label: string;
  hint: string;
}[] = [
  {
    role: "ADMIN",
    email: "admin@aushadhi.local",
    password: "admin123",
    label: "Admin",
    hint: "Full access",
  },
  {
    role: "SELLER",
    email: "seller@aushadhi.local",
    password: "seller123",
    label: "Seller",
    hint: "Sales and customers",
  },
  {
    role: "ACCOUNTANT",
    email: "accountant@aushadhi.local",
    password: "accountant123",
    label: "Accountant",
    hint: "Reports and ledger",
  },
  {
    role: "RETAILER",
    email: "retailer@aushadhi.local",
    password: "retailer123",
    label: "Retailer",
    hint: "Read only catalog",
  },
];

export const DEMO_ADMIN = DEMO_ROLES[0];
