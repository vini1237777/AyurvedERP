import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const COA: { code: string; name: string; type: string }[] = [
  // ASSETS
  { code: "1000", name: "Cash", type: "ASSET" },
  { code: "1010", name: "Bank", type: "ASSET" },
  { code: "1100", name: "Sundry Debtors", type: "ASSET" },
  { code: "1300", name: "GST Input - CGST", type: "ASSET" },
  { code: "1310", name: "GST Input - SGST", type: "ASSET" },
  { code: "1320", name: "GST Input - IGST", type: "ASSET" },

  // LIABILITIES
  { code: "2000", name: "Sundry Creditors", type: "LIABILITY" },
  { code: "2100", name: "GST Output - CGST", type: "LIABILITY" },
  { code: "2110", name: "GST Output - SGST", type: "LIABILITY" },
  { code: "2120", name: "GST Output - IGST", type: "LIABILITY" },

  // EQUITY
  { code: "3000", name: "Capital", type: "EQUITY" },
  { code: "3100", name: "Retained Earnings", type: "EQUITY" },

  // INCOME
  { code: "4000", name: "Sales", type: "INCOME" },
  { code: "4100", name: "Sales Returns", type: "INCOME" },

  // EXPENSES
  { code: "5000", name: "Purchases", type: "EXPENSE" },
  { code: "5100", name: "Purchase Returns", type: "EXPENSE" },
  { code: "5200", name: "Discount Allowed", type: "EXPENSE" },
];

async function seedAccounts() {
  for (const a of COA) {
    await prisma.account.upsert({
      where: { code: a.code },
      update: { name: a.name, type: a.type },
      create: a,
    });
  }
  console.log(`✔ Seeded ${COA.length} accounts`);
}

const DEMO_USERS: { email: string; name: string; password: string; role: string }[] = [
  {
    email: process.env.ADMIN_EMAIL || "admin@aushadhi.local",
    name: process.env.ADMIN_NAME || "Admin",
    password: process.env.ADMIN_PASSWORD || "admin123",
    role: "ADMIN",
  },
  { email: "seller@aushadhi.local", name: "Sales User", password: "seller123", role: "SELLER" },
  { email: "accountant@aushadhi.local", name: "Accountant", password: "accountant123", role: "ACCOUNTANT" },
  { email: "retailer@aushadhi.local", name: "Retailer", password: "retailer123", role: "RETAILER" },
];

async function seedUsers() {
  for (const u of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, isActive: true },
      create: { email: u.email, name: u.name, passwordHash, role: u.role },
    });
    console.log(`✔ ${u.role.padEnd(11)} ${u.email} (password: ${u.password})`);
  }
}

async function main() {
  await seedAccounts();
  await seedUsers();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
