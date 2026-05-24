/**
 * Diagnoses why Trial Balance is out of balance.
 * Run: npx ts-node src/scripts/audit-trial-balance.ts
 */
import prisma from "../utils/prisma";

const r2 = (v: number) => Math.round(v * 100) / 100;

async function main() {
  console.log("─── 1. Per-entry imbalance ──────────────────────────────────");
  const entries = await prisma.journalEntry.findMany({
    select: {
      id: true,
      entryNo: true,
      refType: true,
      refId: true,
      isReversed: true,
      lines: { select: { debit: true, credit: true } },
    },
    orderBy: { id: "asc" },
  });

  let unbalancedEntries = 0;
  for (const e of entries) {
    const dr = r2(e.lines.reduce((s, l) => s + l.debit, 0));
    const cr = r2(e.lines.reduce((s, l) => s + l.credit, 0));
    if (dr !== cr) {
      unbalancedEntries++;
      console.log(
        `  ✗ ${e.entryNo} (${e.refType}#${e.refId}) Dr=${dr} Cr=${cr} diff=${r2(dr - cr)}`,
      );
    }
  }
  console.log(`  Total entries: ${entries.length}, unbalanced: ${unbalancedEntries}`);

  console.log("\n─── 2. Invoices vs INVOICE journal entries ──────────────────");
  const invoices = await prisma.invoice.findMany({
    select: { id: true, invoiceNo: true, status: true, grandTotal: true },
  });
  const invEntries = entries.filter((e) => e.refType === "INVOICE");
  const invEntryIds = new Set(invEntries.map((e) => e.refId));
  const invoicesWithoutEntry = invoices.filter((i) => !invEntryIds.has(i.id));
  console.log(`  Invoices: ${invoices.length}, INVOICE entries: ${invEntries.length}`);
  if (invoicesWithoutEntry.length) {
    console.log(`  ✗ Invoices missing journal entry:`);
    for (const i of invoicesWithoutEntry) {
      console.log(`    - inv#${i.id} ${i.invoiceNo} ${i.status} ₹${i.grandTotal}`);
    }
  }

  console.log("\n─── 3. Purchases vs PURCHASE journal entries ────────────────");
  const purchases = await prisma.purchase.findMany({
    select: { id: true, purchaseNo: true, status: true, grandTotal: true },
  });
  const purEntries = entries.filter((e) => e.refType === "PURCHASE");
  const purEntryIds = new Set(purEntries.map((e) => e.refId));
  const purchasesWithoutEntry = purchases.filter((p) => !purEntryIds.has(p.id));
  console.log(`  Purchases: ${purchases.length}, PURCHASE entries: ${purEntries.length}`);
  if (purchasesWithoutEntry.length) {
    console.log(`  ✗ Purchases missing journal entry:`);
    for (const p of purchasesWithoutEntry) {
      console.log(`    - pur#${p.id} ${p.purchaseNo} ${p.status} ₹${p.grandTotal}`);
    }
  }

  console.log("\n─── 4. Cancelled invoices/purchases without reversal ────────");
  const reversalEntries = entries.filter((e) =>
    e.refType?.endsWith("_REVERSAL"),
  );
  const reversalKeys = new Set(
    reversalEntries.map((e) => `${e.refType?.replace("_REVERSAL", "")}#${e.refId}`),
  );
  const cancelledInvWithoutReversal = invoices.filter(
    (i) => i.status === "CANCELLED" && !reversalKeys.has(`INVOICE#${i.id}`),
  );
  const cancelledPurWithoutReversal = purchases.filter(
    (p) => p.status === "CANCELLED" && !reversalKeys.has(`PURCHASE#${p.id}`),
  );
  if (cancelledInvWithoutReversal.length) {
    console.log(`  ✗ Cancelled invoices missing reversal:`);
    for (const i of cancelledInvWithoutReversal)
      console.log(`    - inv#${i.id} ${i.invoiceNo}`);
  }
  if (cancelledPurWithoutReversal.length) {
    console.log(`  ✗ Cancelled purchases missing reversal:`);
    for (const p of cancelledPurWithoutReversal)
      console.log(`    - pur#${p.id} ${p.purchaseNo}`);
  }

  console.log("\n─── 5. Overall TB totals ────────────────────────────────────");
  const allLines = await prisma.journalLine.findMany({
    select: { debit: true, credit: true },
  });
  const totalDr = r2(allLines.reduce((s, l) => s + l.debit, 0));
  const totalCr = r2(allLines.reduce((s, l) => s + l.credit, 0));
  console.log(`  Σ debit  = ${totalDr}`);
  console.log(`  Σ credit = ${totalCr}`);
  console.log(`  diff     = ${r2(totalDr - totalCr)}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
