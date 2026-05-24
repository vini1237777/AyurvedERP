import { PrismaClient } from "@prisma/client";
import {
  postInvoice,
  postPurchase,
  postSalesReturn,
  postPurchaseReturn,
} from "../src/services/posting.service";

const prisma = new PrismaClient();

const r2 = (v: number) => Math.round(v * 100) / 100;

async function ensureAccountsExist() {
  const count = await prisma.account.count();
  if (count === 0) {
    throw new Error(
      "No accounts found. Run `npm run bootstrap` first to seed the chart of accounts.",
    );
  }
}

async function alreadyPosted(refType: string, refId: number) {
  const found = await prisma.journalEntry.findFirst({
    where: { refType, refId, isReversed: false },
    select: { id: true },
  });
  return !!found;
}

async function backfillInvoices() {
  const invoices = await prisma.invoice.findMany({
    where: { status: { not: "CANCELLED" } },
    orderBy: { invoiceDate: "asc" },
    select: {
      id: true,
      invoiceNo: true,
      invoiceDate: true,
      taxType: true,
      totalTaxable: true,
      cgstAmt: true,
      sgstAmt: true,
      igstAmt: true,
      grandTotal: true,
    },
  });

  let posted = 0;
  for (const inv of invoices) {
    if (await alreadyPosted("INVOICE", inv.id)) continue;
    await prisma.$transaction((tx) =>
      postInvoice(tx, {
        invoiceId: inv.id,
        invoiceNo: inv.invoiceNo,
        date: inv.invoiceDate,
        taxType: inv.taxType as "CGST_SGST" | "IGST",
        totalTaxable: r2(inv.totalTaxable),
        cgstAmt: r2(inv.cgstAmt),
        sgstAmt: r2(inv.sgstAmt),
        igstAmt: r2(inv.igstAmt),
        grandTotal: r2(inv.grandTotal),
      }),
    );
    posted++;
  }
  console.log(`✔ Invoices: posted ${posted} / ${invoices.length}`);
}

async function backfillPurchases() {
  const purchases = await prisma.purchase.findMany({
    where: { status: { not: "CANCELLED" } },
    orderBy: { purchaseDate: "asc" },
    select: {
      id: true,
      purchaseNo: true,
      purchaseDate: true,
      taxType: true,
      totalTaxable: true,
      cgstAmt: true,
      sgstAmt: true,
      igstAmt: true,
      grandTotal: true,
    },
  });

  let posted = 0;
  for (const p of purchases) {
    if (await alreadyPosted("PURCHASE", p.id)) continue;
    await prisma.$transaction((tx) =>
      postPurchase(tx, {
        purchaseId: p.id,
        purchaseNo: p.purchaseNo,
        date: p.purchaseDate,
        taxType: p.taxType as "CGST_SGST" | "IGST",
        totalTaxable: r2(p.totalTaxable),
        cgstAmt: r2(p.cgstAmt),
        sgstAmt: r2(p.sgstAmt),
        igstAmt: r2(p.igstAmt),
        grandTotal: r2(p.grandTotal),
      }),
    );
    posted++;
  }
  console.log(`✔ Purchases: posted ${posted} / ${purchases.length}`);
}

async function backfillSalesReturns() {
  const returns = await prisma.salesReturn.findMany({
    orderBy: { createdAt: "asc" },
    include: { invoice: { select: { invoiceNo: true, taxType: true } } },
  });

  let posted = 0;
  for (const sr of returns) {
    if (await alreadyPosted("SALES_RETURN", sr.id)) continue;
    await prisma.$transaction((tx) =>
      postSalesReturn(tx, {
        salesReturnId: sr.id,
        returnNo: sr.returnNo,
        invoiceNo: sr.invoice.invoiceNo,
        date: sr.createdAt,
        taxType: sr.invoice.taxType as "CGST_SGST" | "IGST",
        totalTaxable: r2(sr.totalTaxable),
        totalTax: r2(sr.totalTax),
        totalCredit: r2(sr.totalCredit),
      }),
    );
    posted++;
  }
  console.log(`✔ Sales returns: posted ${posted} / ${returns.length}`);
}

async function backfillPurchaseReturns() {
  const returns = await prisma.purchaseReturn.findMany({
    orderBy: { createdAt: "asc" },
    include: { purchase: { select: { purchaseNo: true, taxType: true } } },
  });

  let posted = 0;
  for (const pr of returns) {
    if (await alreadyPosted("PURCHASE_RETURN", pr.id)) continue;
    await prisma.$transaction((tx) =>
      postPurchaseReturn(tx, {
        purchaseReturnId: pr.id,
        returnNo: pr.returnNo,
        purchaseNo: pr.purchase.purchaseNo,
        date: pr.createdAt,
        taxType: pr.purchase.taxType as "CGST_SGST" | "IGST",
        totalTaxable: r2(pr.totalTaxable),
        totalTax: r2(pr.totalTax),
        totalDebit: r2(pr.totalDebit),
      }),
    );
    posted++;
  }
  console.log(`✔ Purchase returns: posted ${posted} / ${returns.length}`);
}

async function verifyTrialBalance() {
  const lines = await prisma.journalLine.findMany({
    select: { debit: true, credit: true },
  });
  const totalDr = r2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCr = r2(lines.reduce((s, l) => s + l.credit, 0));
  const balanced = totalDr === totalCr;
  console.log("");
  console.log(`Trial balance after backfill:`);
  console.log(`  Σ Debit  = ₹${totalDr.toLocaleString("en-IN")}`);
  console.log(`  Σ Credit = ₹${totalCr.toLocaleString("en-IN")}`);
  console.log(
    balanced
      ? `  ✔ Balanced — double-entry audit passes`
      : `  ✗ Out of balance by ₹${r2(totalDr - totalCr)}`,
  );
}

async function main() {
  await ensureAccountsExist();
  console.log("Backfilling ledger from existing invoices/purchases/returns…");
  console.log("");
  await backfillInvoices();
  await backfillPurchases();
  await backfillSalesReturns();
  await backfillPurchaseReturns();
  await verifyTrialBalance();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
