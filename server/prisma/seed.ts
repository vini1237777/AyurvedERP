import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const r2 = (v: number) => Math.round(v * 100) / 100;

// Deterministic RNG so runs reproduce the same dataset
let _seed = 42;
function rand() {
  _seed = (_seed * 9301 + 49297) % 233280;
  return _seed / 233280;
}
const rPick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const rInt = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min;
const rFloat = (min: number, max: number) => rand() * (max - min) + min;

// ── Reference data ───────────────────────────────────────────────────────
const STATES = [
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "24", name: "Gujarat" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "07", name: "Delhi" },
  { code: "33", name: "Tamil Nadu" },
  { code: "32", name: "Kerala" },
  { code: "30", name: "Goa" },
  { code: "19", name: "West Bengal" },
  { code: "08", name: "Rajasthan" },
  { code: "10", name: "Bihar" },
];

const MH_CITIES = [
  "Pune",
  "Mumbai",
  "Nagpur",
  "Nashik",
  "Aurangabad",
  "Solapur",
  "Kolhapur",
  "Sangli",
  "Satara",
  "Tasgaon",
  "Ichalkaranji",
  "Latur",
  "Akola",
  "Amravati",
  "Thane",
];

const FIRST_NAMES = [
  "Rajesh",
  "Suresh",
  "Mahesh",
  "Anil",
  "Sunil",
  "Vikas",
  "Prakash",
  "Ramesh",
  "Manoj",
  "Sandeep",
  "Amit",
  "Rohit",
  "Pawan",
  "Deepak",
  "Ashok",
  "Vinod",
  "Sachin",
  "Nilesh",
  "Yogesh",
  "Mahadev",
  "Ganesh",
  "Hari",
  "Shankar",
  "Vijay",
  "Ajay",
  "Pravin",
  "Sanjay",
  "Dilip",
  "Kishor",
  "Arun",
];
const LAST_NAMES = [
  "Patil",
  "Deshmukh",
  "Joshi",
  "Kulkarni",
  "Sharma",
  "Verma",
  "Singh",
  "Pawar",
  "Kale",
  "More",
  "Shinde",
  "Jadhav",
  "Bhosale",
  "Mane",
  "Kamble",
  "Salunkhe",
  "Chavan",
  "Gaikwad",
  "Suryavanshi",
  "Thakur",
  "Mehta",
  "Shah",
  "Iyer",
  "Reddy",
  "Nair",
];
const SHOP_SUFFIX = [
  "Ayurved",
  "Aushadhalay",
  "Medical Stores",
  "Pharmacy",
  "Health Care",
  "Wellness",
  "Healing Centre",
  "Clinic",
  "Distributors",
  "Traders",
  "Enterprises",
  "Agencies",
];

const AYURVEDIC_PRODUCTS = [
  { name: "Triphala Churna", units: ["50gm", "100gm", "250gm", "500gm"] },
  { name: "Ashwagandha Churna", units: ["50gm", "100gm", "250gm"] },
  { name: "Brahmi Vati", units: ["30 Tab", "60 Tab", "100 Tab"] },
  { name: "Chyawanprash", units: ["250gm", "500gm", "1 Kg"] },
  { name: "Mahanarayan Tel", units: ["50ml", "100ml", "200ml"] },
  { name: "Kumkumadi Tel", units: ["10ml", "20ml", "50ml"] },
  { name: "Nasya Tel", units: ["10ml", "20ml", "30ml"] },
  { name: "Bhringraj Tel", units: ["100ml", "200ml"] },
  { name: "Neem Tab", units: ["30 Tab", "60 Tab"] },
  { name: "Tulsi Drops", units: ["10ml", "30ml"] },
  { name: "Giloy Vati", units: ["30 Tab", "60 Tab"] },
  { name: "Arjun Churna", units: ["50gm", "100gm"] },
  { name: "Shatavari Churna", units: ["50gm", "100gm"] },
  { name: "Sitopaladi Churna", units: ["25gm", "50gm"] },
  { name: "Trikatu Churna", units: ["25gm", "50gm"] },
  { name: "Avipattikar Churna", units: ["50gm", "100gm"] },
  { name: "Hingvashtak Churna", units: ["50gm", "100gm"] },
  { name: "Punarnavadi Mandoor", units: ["30 Tab", "60 Tab"] },
  { name: "Saraswatarishta", units: ["200ml", "450ml"] },
  { name: "Ashokarishta", units: ["200ml", "450ml"] },
  { name: "Dashamoolarishta", units: ["200ml", "450ml"] },
  { name: "Drakshasava", units: ["200ml", "450ml"] },
  { name: "Kumaryasava", units: ["200ml", "450ml"] },
  { name: "Chandanasava", units: ["200ml", "450ml"] },
  { name: "Mahasudarshan Kadha", units: ["100ml", "200ml"] },
  { name: "Vasaka Syrup", units: ["100ml", "200ml"] },
  { name: "Liv-52 DS Tab", units: ["60 Tab", "100 Tab"] },
  { name: "Cystone Tab", units: ["60 Tab", "100 Tab"] },
  { name: "Lukol Tab", units: ["60 Tab"] },
  { name: "Geriforte Tab", units: ["60 Tab"] },
  { name: "Septilin Tab", units: ["60 Tab"] },
  { name: "Diabecon Tab", units: ["60 Tab"] },
  { name: "Mentat Syrup", units: ["100ml", "200ml"] },
  { name: "Aloe Vera Juice", units: ["500ml", "1 Ltr"] },
  { name: "Amla Juice", units: ["500ml", "1 Ltr"] },
  { name: "Karela Jamun Juice", units: ["500ml", "1 Ltr"] },
  { name: "Wheatgrass Juice", units: ["500ml"] },
  { name: "Moringa Capsule", units: ["60 Cap", "120 Cap"] },
  { name: "Spirulina Tab", units: ["60 Tab"] },
  { name: "Turmeric Capsule", units: ["60 Cap"] },
  { name: "Garcinia Capsule", units: ["60 Cap"] },
  { name: "Triphala Tab", units: ["60 Tab", "100 Tab"] },
  { name: "Ashwagandha Tab", units: ["60 Tab", "100 Tab"] },
  { name: "Arogyavardhini Vati", units: ["40 Tab"] },
  { name: "Chandraprabha Vati", units: ["80 Tab"] },
  { name: "Trayodashang Guggul", units: ["40 Tab"] },
  { name: "Yogaraj Guggul", units: ["40 Tab"] },
  { name: "Kanchnar Guggul", units: ["40 Tab"] },
  { name: "Praval Pishti", units: ["10gm", "25gm"] },
  { name: "Akik Pishti", units: ["10gm", "25gm"] },
  { name: "Sphatik Bhasma", units: ["10gm"] },
  { name: "Swarna Bhasma", units: ["1gm", "5gm"] },
  { name: "Anu Tail", units: ["10ml", "30ml"] },
  { name: "Shadbindu Tail", units: ["10ml", "30ml"] },
  { name: "Ksheerbala Tail", units: ["100ml"] },
  { name: "Pinda Tail", units: ["100ml"] },
];

const SUPPLIER_NAMES = [
  "Dabur India Ltd",
  "Patanjali Ayurved",
  "Baidyanath Bhavan",
  "Zandu Pharmaceuticals",
  "Himalaya Wellness",
  "Sandu Pharmaceuticals",
  "Vyas Pharmaceuticals",
  "Maharishi Ayurveda",
  "Charak Pharma",
  "Vicco Laboratories",
  "Emami Healthcare",
  "Kerala Ayurveda Ltd",
  "Sri Sri Tattva",
  "Kapiva Ayurveda",
  "Organic India",
];

function gstinFor(stateCode: string) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const rch = (s: string) => s[Math.floor(rand() * s.length)];
  let pan = "";
  for (let i = 0; i < 5; i++) pan += rch(letters);
  for (let i = 0; i < 4; i++) pan += rch(digits);
  pan += rch(letters);
  return `${stateCode}${pan}1Z${rch(letters)}`;
}

function mobile() {
  let m = "9";
  for (let i = 0; i < 9; i++) m += Math.floor(rand() * 10);
  return m;
}

function fyOf(d: Date) {
  const y = d.getFullYear(),
    m = d.getMonth() + 1;
  return m >= 4
    ? `${y}-${String(y + 1).slice(2)}`
    : `${y - 1}-${String(y).slice(2)}`;
}

async function main() {
  console.log("Wiping existing data...");
  // Order matters — children first
  await prisma.purchaseReturnItem.deleteMany();
  await prisma.purchaseReturn.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.salesReturnItem.deleteMany();
  await prisma.salesReturn.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.itemCategoryPrice.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.item.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.hsnCode.deleteMany();
  await prisma.taxSlab.deleteMany();
  await prisma.company.deleteMany();

  // ── Tax Slabs ──────────────────────────────────────────────────────────
  console.log("Seeding tax slabs...");
  const slab0 = await prisma.taxSlab.create({
    data: { name: "GST 0%", rate: 0 },
  });
  const slab5 = await prisma.taxSlab.create({
    data: { name: "GST 5%", rate: 5 },
  });
  const slab12 = await prisma.taxSlab.create({
    data: { name: "GST 12%", rate: 12 },
  });
  const slab18 = await prisma.taxSlab.create({
    data: { name: "GST 18%", rate: 18 },
  });
  const slab28 = await prisma.taxSlab.create({
    data: { name: "GST 28%", rate: 28 },
  });

  // ── HSN Codes ──────────────────────────────────────────────────────────
  console.log("Seeding HSN codes...");
  const HSN_DEFS = [
    {
      code: "30049011",
      description: "Ayurvedic Medicines (branded)",
      gstRate: 5,
    },
    {
      code: "30049019",
      description: "Ayurvedic Medicines (other)",
      gstRate: 5,
    },
    { code: "30049099", description: "Other Medicaments", gstRate: 12 },
    { code: "33051090", description: "Hair Oil", gstRate: 18 },
    {
      code: "33049990",
      description: "Beauty / Cosmetic Preparations",
      gstRate: 18,
    },
    { code: "33061090", description: "Dental Hygiene Products", gstRate: 18 },
    { code: "21069099", description: "Food Supplements", gstRate: 18 },
    { code: "30039011", description: "Ayurvedic Bulk Drugs", gstRate: 5 },
  ];
  const hsnRecords = await Promise.all(
    HSN_DEFS.map((h) => prisma.hsnCode.create({ data: h })),
  );

  // ── Company ────────────────────────────────────────────────────────────
  console.log("Seeding company...");
  await prisma.company.create({
    data: {
      name: "AUSHADHI WELLNESS PVT LTD",
      address: "PLOT NO 10, MIDC, PUNE 411019",
      mobile: "0000000000",
      gstin: "27AAAAA0000A1Z5",
      pan: "AAAAA0000A",
      stateCode: "27",
      state: "Maharashtra",
      bank: "BANK NAME, BRANCH",
      ifsc: "BANK0000000",
      account: "00000000000000",
    },
  });

  // ── Agents ─────────────────────────────────────────────────────────────
  console.log("Seeding agents...");
  const agents = await Promise.all(
    [
      "Mahadev Bhosale",
      "Suresh Kale",
      "Ramesh Patil",
      "Nilesh More",
      "Sandeep Shinde",
    ].map((name) => prisma.agent.create({ data: { name, mobile: mobile() } })),
  );

  // ── Customers (200) ────────────────────────────────────────────────────
  console.log("Seeding 200 customers...");
  const customers: { id: number; stateCode: string }[] = [];
  for (let i = 0; i < 200; i++) {
    const isSupplier = i >= 170; // last 30 are suppliers
    let name: string,
      address: string,
      city: string,
      state: { code: string; name: string };
    let gstin: string | null;

    if (isSupplier) {
      name = SUPPLIER_NAMES[i - 170] || `Ayur Supplier ${i - 169}`;
      state = STATES[rInt(0, STATES.length - 1)];
      city =
        state.code === "27" ? rPick(MH_CITIES) : `${state.name.split(" ")[0]} City`;
      address = `Industrial Area, ${city}`;
      gstin = gstinFor(state.code);
    } else {
      const fn = rPick(FIRST_NAMES),
        ln = rPick(LAST_NAMES),
        suf = rPick(SHOP_SUFFIX);
      name = `${fn} ${ln} ${suf}`;
      // 80% MH, 20% spread across other states (for IGST)
      state = rand() < 0.8 ? STATES[0] : STATES[rInt(1, STATES.length - 1)];
      city = state.code === "27" ? rPick(MH_CITIES) : `${state.name} City`;
      address = `Shop No ${rInt(1, 200)}, Main Road, ${city}`;
      // 60% have GSTIN
      gstin = rand() < 0.6 ? gstinFor(state.code) : null;
    }

    const c = await prisma.customer.create({
      data: {
        name,
        gstin,
        state: state.name,
        stateCode: state.code,
        address,
        city,
        pincode: String(400000 + rInt(0, 99999)),
        mobile: mobile(),
        category: isSupplier ? "Supplier" : rPick(["Retail", "Wholesale", "Doctor"]),
        isActive: true,
      },
    });
    customers.push({ id: c.id, stateCode: state.code });
  }
  const salesCustomers = customers.slice(0, 170);
  const supplierCustomers = customers.slice(170);

  // ── Items (200) + Batches ──────────────────────────────────────────────
  console.log("Seeding 200 items with batches...");
  const slabs = [
    { rate: 5, slab: slab5 },
    { rate: 12, slab: slab12 },
    { rate: 18, slab: slab18 },
  ];
  const items: { id: number; gst: number; hsn: string }[] = [];
  const batches: {
    id: number;
    itemId: number;
    salePrice: number;
    purchasePrice: number;
    mrp: number;
    hsn: string;
    gst: number;
  }[] = [];

  let productIdx = 0;
  for (let i = 0; i < 200; i++) {
    const base = AYURVEDIC_PRODUCTS[productIdx % AYURVEDIC_PRODUCTS.length];
    productIdx++;
    const unit = rPick(base.units);
    const name = `${base.name} ${unit}`;
    // Match HSN by category
    let hsn = hsnRecords[0]; // default ayurvedic
    if (/Tel|Tail|Oil/i.test(base.name)) {
      hsn = hsnRecords.find((h) => h.code === "33051090") || hsn;
    } else if (/Capsule|Juice/i.test(base.name)) {
      hsn = hsnRecords.find((h) => h.code === "21069099") || hsn;
    } else {
      hsn = rPick(hsnRecords.filter((h) => [5, 12].includes(h.gstRate)));
    }
    const slab = slabs.find((s) => s.rate === hsn.gstRate) || slabs[0];

    const purchase = r2(rFloat(20, 800));
    const mrp = r2(purchase * rFloat(1.4, 2.2));
    const sale = r2(mrp / 1.15); // approx sale before tax

    const item = await prisma.item.create({
      data: {
        name,
        hsnId: hsn.id,
        taxSlabId: slab.slab.id,
        unit: "Pcs",
        altUnit: "Box",
        altFactor: rPick([10, 12, 20, 24, 30]),
        mrp,
        rate: sale,
        maintainBatch: true,
      },
    });
    items.push({ id: item.id, gst: hsn.gstRate, hsn: hsn.code });

    // 2-4 batches per item
    const batchCount = rInt(2, 4);
    for (let b = 0; b < batchCount; b++) {
      const yr = 2027 + rInt(0, 2);
      const mfgYr = yr - 3;
      const mn = rInt(1, 12);
      const qty = rInt(50, 800);
      const batch = await prisma.batch.create({
        data: {
          itemId: item.id,
          batchNo: `B${String(item.id).padStart(3, "0")}-${String.fromCharCode(65 + b)}${rInt(10, 99)}`,
          expiryDate: `${mn}-${yr}`,
          mfgDate: `${mn}-${mfgYr}`,
          purchasePrice: purchase,
          salePrice: sale,
          mrp,
          openingQty: qty,
          currentQty: qty,
        },
      });
      batches.push({
        id: batch.id,
        itemId: item.id,
        salePrice: sale,
        purchasePrice: purchase,
        mrp,
        hsn: hsn.code,
        gst: hsn.gstRate,
      });
    }
  }

  // ── Sale Invoices (200) ────────────────────────────────────────────────
  console.log("Seeding 200 sale invoices...");
  // spread over last 6 months
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  const dayMs = 24 * 60 * 60 * 1000;
  const spanDays = Math.floor((now.getTime() - sixMonthsAgo.getTime()) / dayMs);

  for (let i = 0; i < 200; i++) {
    const dateOffset = Math.floor((i / 200) * spanDays) + rInt(0, 1);
    const invoiceDate = new Date(sixMonthsAgo.getTime() + dateOffset * dayMs);
    const cust = rPick(salesCustomers);
    const taxType = cust.stateCode === "27" ? "CGST_SGST" : "IGST";
    const fy = fyOf(invoiceDate);

    const lineCount = rInt(1, 5);
    const lineItems: any[] = [];
    let totalDiscount = 0,
      totalTaxable = 0,
      totalTax = 0;
    const usedBatchIds = new Set<number>();
    for (let l = 0; l < lineCount; l++) {
      let b: typeof batches[0];
      let tries = 0;
      do {
        b = rPick(batches);
        tries++;
      } while (usedBatchIds.has(b.id) && tries < 20);
      usedBatchIds.add(b.id);

      const qty = rInt(1, 20);
      const rate = b.salePrice;
      const disc = rPick([0, 0, 0, 5, 10, 15]);
      const basicAmt = r2(rate * qty);
      const discAmt = r2((basicAmt * disc) / 100);
      const taxableAmt = r2(basicAmt - discAmt);
      const taxAmt = r2((taxableAmt * b.gst) / 100);
      const netValue = r2(taxableAmt + taxAmt);

      lineItems.push({
        itemId: b.itemId,
        batchId: b.id,
        itemName: `Item-${b.itemId}`, // overwritten below
        hsnCode: b.hsn,
        mrp: b.mrp,
        rate,
        qty,
        per: "Pcs",
        basicAmt,
        discPercent: disc,
        discAmt,
        taxableAmt,
        gstPercent: b.gst,
        taxAmt,
        netValue,
      });
      totalDiscount += discAmt;
      totalTaxable += taxableAmt;
      totalTax += taxAmt;
    }

    const cgstAmt = taxType === "CGST_SGST" ? r2(totalTax / 2) : 0;
    const sgstAmt = taxType === "CGST_SGST" ? r2(totalTax - cgstAmt) : 0;
    const igstAmt = taxType === "IGST" ? r2(totalTax) : 0;
    const grandTotal = r2(totalTaxable + totalTax);

    // Get item names
    const itemRows = await prisma.item.findMany({
      where: { id: { in: lineItems.map((x) => x.itemId) } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(itemRows.map((x) => [x.id, x.name]));
    lineItems.forEach((li) => {
      li.itemName = nameMap.get(li.itemId) || li.itemName;
    });

    const custRow = await prisma.customer.findUnique({
      where: { id: cust.id },
    });
    const invoiceNo = String(i + 1).padStart(4, "0");

    await prisma.invoice.create({
      data: {
        invoiceNo,
        financialYear: fy,
        invoiceDate,
        customerId: cust.id,
        agentId: rPick(agents).id,
        customerGstin: custRow!.gstin,
        customerState: custRow!.state,
        customerStateCode: custRow!.stateCode,
        taxType,
        totalDiscount: r2(totalDiscount),
        totalTaxable: r2(totalTaxable),
        cgstAmt,
        sgstAmt,
        igstAmt,
        totalTax: r2(totalTax),
        grandTotal,
        status: "SAVED",
        items: { create: lineItems },
      },
    });

    // Deduct stock
    for (const li of lineItems) {
      await prisma.batch.update({
        where: { id: li.batchId },
        data: { currentQty: { decrement: li.qty } },
      });
    }
  }

  // ── Purchase Invoices (200) ────────────────────────────────────────────
  console.log("Seeding 200 purchase invoices...");
  for (let i = 0; i < 200; i++) {
    const dateOffset = Math.floor((i / 200) * spanDays) + rInt(0, 1);
    const purchaseDate = new Date(sixMonthsAgo.getTime() + dateOffset * dayMs);
    const sup = rPick(supplierCustomers);
    const taxType = sup.stateCode === "27" ? "CGST_SGST" : "IGST";
    const fy = fyOf(purchaseDate);

    const lineCount = rInt(2, 6);
    const lineItems: any[] = [];
    let totalDiscount = 0,
      totalTaxable = 0,
      totalTax = 0;
    for (let l = 0; l < lineCount; l++) {
      const b = rPick(batches);
      const qty = rInt(20, 200);
      const rate = b.purchasePrice;
      const disc = rPick([0, 0, 5, 10]);
      const basicAmt = r2(rate * qty);
      const discAmt = r2((basicAmt * disc) / 100);
      const taxableAmt = r2(basicAmt - discAmt);
      const taxAmt = r2((taxableAmt * b.gst) / 100);
      const netValue = r2(taxableAmt + taxAmt);

      lineItems.push({
        itemId: b.itemId,
        batchId: b.id,
        itemName: `Item-${b.itemId}`,
        hsnCode: b.hsn,
        mrp: b.mrp,
        rate,
        qty,
        per: "Pcs",
        basicAmt,
        discPercent: disc,
        discAmt,
        taxableAmt,
        gstPercent: b.gst,
        taxAmt,
        netValue,
      });
      totalDiscount += discAmt;
      totalTaxable += taxableAmt;
      totalTax += taxAmt;
    }

    const cgstAmt = taxType === "CGST_SGST" ? r2(totalTax / 2) : 0;
    const sgstAmt = taxType === "CGST_SGST" ? r2(totalTax - cgstAmt) : 0;
    const igstAmt = taxType === "IGST" ? r2(totalTax) : 0;
    const grandTotal = r2(totalTaxable + totalTax);

    const itemRows = await prisma.item.findMany({
      where: { id: { in: lineItems.map((x) => x.itemId) } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(itemRows.map((x) => [x.id, x.name]));
    lineItems.forEach((li) => {
      li.itemName = nameMap.get(li.itemId) || li.itemName;
    });

    const supRow = await prisma.customer.findUnique({ where: { id: sup.id } });
    const purchaseNo = `FP-${String(i + 1).padStart(4, "0")}`;

    await prisma.purchase.create({
      data: {
        purchaseNo,
        financialYear: fy,
        purchaseDate,
        supplierId: sup.id,
        supplierGstin: supRow!.gstin,
        supplierState: supRow!.state,
        supplierStateCode: supRow!.stateCode,
        taxType,
        totalDiscount: r2(totalDiscount),
        totalTaxable: r2(totalTaxable),
        cgstAmt,
        sgstAmt,
        igstAmt,
        totalTax: r2(totalTax),
        grandTotal,
        status: "SAVED",
        items: { create: lineItems },
      },
    });

    // Increment stock from purchase
    for (const li of lineItems) {
      await prisma.batch.update({
        where: { id: li.batchId },
        data: { currentQty: { increment: li.qty } },
      });
    }
  }

  console.log("");
  console.log("─────────────────────────────────────────");
  console.log("Seed complete ✓");
  console.log("─────────────────────────────────────────");
  console.log(`  Tax Slabs:          5`);
  console.log(`  HSN Codes:          ${hsnRecords.length}`);
  console.log(`  Company:            1 (Aushadhi Wellness Pvt Ltd)`);
  console.log(`  Agents:             ${agents.length}`);
  console.log(`  Customers:          ${salesCustomers.length}`);
  console.log(`  Suppliers:          ${supplierCustomers.length}`);
  console.log(`  Items:              ${items.length}`);
  console.log(`  Batches:            ${batches.length}`);
  console.log(`  Sale Invoices:      200`);
  console.log(`  Purchase Invoices:  200`);
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
