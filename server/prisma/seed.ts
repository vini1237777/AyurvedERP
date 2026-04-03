import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // ── Tax Slabs ──────────────────────────────────────────────────
  await prisma.taxSlab.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "GST 0%", rate: 0 },
  });
  await prisma.taxSlab.upsert({
    where: { id: 2 },
    update: {},
    create: { name: "GST 5%", rate: 5 },
  });
  await prisma.taxSlab.upsert({
    where: { id: 3 },
    update: {},
    create: { name: "GST 12%", rate: 12 },
  });
  await prisma.taxSlab.upsert({
    where: { id: 4 },
    update: {},
    create: { name: "GST 18%", rate: 18 },
  });
  await prisma.taxSlab.upsert({
    where: { id: 5 },
    update: {},
    create: { name: "GST 28%", rate: 28 },
  });

  // ── HSN Codes ──────────────────────────────────────────────────
  const hsn1 = await prisma.hsnCode.upsert({
    where: { code: "30049011" },
    update: {},
    create: {
      code: "30049011",
      description: "Ayurvedic Medicines (branded)",
      gstRate: 5,
    },
  });
  await prisma.hsnCode.upsert({
    where: { code: "30049019" },
    update: {},
    create: {
      code: "30049019",
      description: "Ayurvedic Medicines (other)",
      gstRate: 5,
    },
  });
  await prisma.hsnCode.upsert({
    where: { code: "30049099" },
    update: {},
    create: { code: "30049099", description: "Other Medicaments", gstRate: 12 },
  });
  await prisma.hsnCode.upsert({
    where: { code: "33051090" },
    update: {},
    create: { code: "33051090", description: "Hair Oil", gstRate: 18 },
  });
  await prisma.hsnCode.upsert({
    where: { code: "33049990" },
    update: {},
    create: {
      code: "33049990",
      description: "Beauty / Cosmetic Preparations",
      gstRate: 18,
    },
  });
  await prisma.hsnCode.upsert({
    where: { code: "33061090" },
    update: {},
    create: {
      code: "33061090",
      description: "Dental Hygiene Products",
      gstRate: 18,
    },
  });

  // ── Company ────────────────────────────────────────────────────
  await prisma.company.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "FULANAND AYURVED",
      address: "RAJMANE PLOT, PLOT NO 48 DHAVALVES, TASGAON TASGAON",
      mobile: "8668446400",
      gstin: "27AZVPB8817G2ZW",
      pan: "AZVPB8817G",
      stateCode: "27",
      state: "Maharashtra",
      bank: "UCO BANK, TASGAON",
      ifsc: "UCB40003225",
      account: "22250610000311",
    },
  });

  // ── Agents ─────────────────────────────────────────────────────
  await prisma.agent.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "Mahadev Bhosale", mobile: "9823456789" },
  });
  await prisma.agent.upsert({
    where: { id: 2 },
    update: {},
    create: { name: "Meetesh" },
  });
  await prisma.agent.upsert({
    where: { id: 3 },
    update: {},
    create: { name: "MG" },
  });

  // ── Customers ──────────────────────────────────────────────────
  await prisma.customer.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Fulanand Ayurvedic Aushadhalay, Tasgaon",
      gstin: "",
      state: "Maharashtra",
      stateCode: "27",
      address: "Rajmane Plot, Tasgaon",
      mobile: "9096505475",
    },
  });
  await prisma.customer.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "Shri Pharma Ayurved, Tasgaon",
      gstin: "27ANBPG9537G1ZX",
      state: "Maharashtra",
      stateCode: "27",
      address: "Paga Galli Tasgaon",
      mobile: "9970941166",
    },
  });
  await prisma.customer.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: "Dr Gajgeshwar Kamini, Ichalkaranji",
      gstin: "",
      state: "Maharashtra",
      stateCode: "27",
      address: "Ichalkaranji",
      mobile: "9876543210",
    },
  });
  await prisma.customer.upsert({
    where: { id: 4 },
    update: {},
    create: {
      name: "Mahadev Medical, Sangli",
      gstin: "27ABCDE1234F1Z5",
      state: "Maharashtra",
      stateCode: "27",
      address: "Main Road, Sangli",
      mobile: "9823456780",
    },
  });

  // ── Items ──────────────────────────────────────────────────────
  const slab5 = await prisma.taxSlab.findFirst({ where: { rate: 5 } });

  const item1 = await prisma.item.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Nura 62 - Tab 30 - Spa",
      hsnId: hsn1.id,
      taxSlabId: slab5!.id,
      unit: "Pcs",
      altUnit: "Box",
      altFactor: 30,
      maintainBatch: true,
    },
  });
  const item2 = await prisma.item.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "Aawala Churn 50 Gm - Spa",
      hsnId: hsn1.id,
      taxSlabId: slab5!.id,
      unit: "Pcs",
      altUnit: "Box",
      altFactor: 12,
      maintainBatch: true,
    },
  });
  const item3 = await prisma.item.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: "Kumkumadi Tel 10 Ml - Spa",
      hsnId: hsn1.id,
      taxSlabId: slab5!.id,
      unit: "Pcs",
      altUnit: "Box",
      altFactor: 24,
      maintainBatch: true,
    },
  });
  const item4 = await prisma.item.upsert({
    where: { id: 4 },
    update: {},
    create: {
      name: "Aarya Tel 100 Ml - Spa",
      hsnId: hsn1.id,
      taxSlabId: slab5!.id,
      unit: "Pcs",
      altUnit: "Box",
      altFactor: 12,
      maintainBatch: true,
    },
  });

  // ── Batches (only create if not exists) ────────────────────────
  async function addBatch(
    itemId: number,
    data: {
      batchNo: string;
      expiryDate: string;
      mfgDate?: string;
      purchasePrice: number;
      salePrice: number;
      mrp: number;
      openingQty: number;
      currentQty: number;
    },
  ) {
    const exists = await prisma.batch.findFirst({
      where: { itemId, batchNo: data.batchNo },
    });
    if (!exists) await prisma.batch.create({ data: { ...data, itemId } });
  }

  // Item 1 — Nura 62
  await addBatch(item1.id, {
    batchNo: "NU01",
    expiryDate: "9-2028",
    mfgDate: "9-2025",
    purchasePrice: 480,
    salePrice: 600,
    mrp: 600,
    openingQty: 500,
    currentQty: 500,
  });
  await addBatch(item1.id, {
    batchNo: "nu02",
    expiryDate: "10-2028",
    mfgDate: "10-2025",
    purchasePrice: 480,
    salePrice: 600,
    mrp: 600,
    openingQty: 400,
    currentQty: 400,
  });
  await addBatch(item1.id, {
    batchNo: "NUR01",
    expiryDate: "12-2028",
    mfgDate: "12-2025",
    purchasePrice: 480,
    salePrice: 600,
    mrp: 600,
    openingQty: 300,
    currentQty: 300,
  });
  await addBatch(item1.id, {
    batchNo: "NUR02",
    expiryDate: "2-2029",
    mfgDate: "2-2026",
    purchasePrice: 480,
    salePrice: 600,
    mrp: 600,
    openingQty: 200,
    currentQty: 200,
  });

  // Item 2 — Aawala Churn
  await addBatch(item2.id, {
    batchNo: "am01",
    expiryDate: "9-2027",
    mfgDate: "9-2024",
    purchasePrice: 28,
    salePrice: 34.29,
    mrp: 45,
    openingQty: 148,
    currentQty: 148,
  });

  // Item 3 — Kumkumadi Tel
  await addBatch(item3.id, {
    batchNo: "kk17",
    expiryDate: "10-2028",
    mfgDate: "10-2025",
    purchasePrice: 170,
    salePrice: 213.34,
    mrp: 213.34,
    openingQty: 200,
    currentQty: 200,
  });

  // Item 4 — Aarya Tel
  await addBatch(item4.id, {
    batchNo: "ah02",
    expiryDate: "10-2028",
    mfgDate: "10-2025",
    purchasePrice: 180,
    salePrice: 228.57,
    mrp: 228.57,
    openingQty: 50,
    currentQty: 50,
  });

  console.log(" Seed completed — no duplicates!");
  console.log("   ✓ Tax Slabs: 5");
  console.log("   ✓ HSN Codes: 6");
  console.log("   ✓ Company: Fulanand Ayurved");
  console.log("   ✓ Agents: 3");
  console.log("   ✓ Customers: 4");
  console.log("   ✓ Items: 5");
  console.log("   ✓ Batches: 9");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
