import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

type Leg = { code: string; debit?: number; credit?: number };

const r2 = (v: number) => Math.round(v * 100) / 100;

async function getAccountIdMap(tx: Tx, codes: string[]) {
  const accounts = await tx.account.findMany({
    where: { code: { in: codes } },
    select: { id: true, code: true },
  });
  const map = new Map(accounts.map((a) => [a.code, a.id]));
  for (const c of codes) {
    if (!map.has(c))
      throw new Error(
        `Account ${c} missing — run bootstrap.ts to seed the chart of accounts`,
      );
  }
  return map;
}

async function getNextEntryNo(tx: Tx): Promise<string> {
  const last = await tx.journalEntry.findFirst({
    where: { entryNo: { startsWith: "JE-" } },
    orderBy: { id: "desc" },
    select: { entryNo: true },
  });
  const max = last ? parseInt(last.entryNo.replace("JE-", ""), 10) || 0 : 0;
  return `JE-${String(max + 1).padStart(6, "0")}`;
}

/**
 * Post a balanced journal entry. Throws if Σdebit ≠ Σcredit.
 */
export async function postEntry(
  tx: Tx,
  args: {
    date: Date;
    narration: string;
    refType: string;
    refId?: number | null;
    legs: Leg[];
  },
) {
  const cleaned = args.legs
    .map((l) => ({
      code: l.code,
      debit: r2(l.debit || 0),
      credit: r2(l.credit || 0),
    }))
    .filter((l) => l.debit > 0 || l.credit > 0);

  const totalDr = r2(cleaned.reduce((s, l) => s + l.debit, 0));
  const totalCr = r2(cleaned.reduce((s, l) => s + l.credit, 0));
  if (totalDr !== totalCr)
    throw new Error(
      `Unbalanced entry: Dr ${totalDr} ≠ Cr ${totalCr} (${args.narration})`,
    );
  if (totalDr === 0) return null;

  const codes = Array.from(new Set(cleaned.map((l) => l.code)));
  const accountMap = await getAccountIdMap(tx, codes);
  const entryNo = await getNextEntryNo(tx);

  return tx.journalEntry.create({
    data: {
      entryNo,
      entryDate: args.date,
      narration: args.narration,
      refType: args.refType,
      refId: args.refId ?? null,
      lines: {
        create: cleaned.map((l) => ({
          accountId: accountMap.get(l.code)!,
          debit: l.debit,
          credit: l.credit,
        })),
      },
    },
  });
}

/**
 * Reverse a prior posting (used on cancel). Creates a new entry that swaps
 * debit/credit on every line of the original, links both with isReversed.
 */
export async function reverseEntriesFor(
  tx: Tx,
  refType: string,
  refId: number,
  reason: string,
) {
  const originals = await tx.journalEntry.findMany({
    where: { refType, refId, isReversed: false },
    include: { lines: { include: { account: true } } },
  });

  for (const orig of originals) {
    const entryNo = await getNextEntryNo(tx);
    const rev = await tx.journalEntry.create({
      data: {
        entryNo,
        entryDate: new Date(),
        narration: `${reason} (reverses ${orig.entryNo})`,
        refType: `${refType}_REVERSAL`,
        refId,
        lines: {
          create: orig.lines.map((l) => ({
            accountId: l.accountId,
            debit: l.credit,
            credit: l.debit,
          })),
        },
      },
    });
    await tx.journalEntry.update({
      where: { id: orig.id },
      data: { isReversed: true, reversedById: rev.id },
    });
  }
}

// ─── Domain posting helpers ──────────────────────────────────────────────────

export type InvoicePostInput = {
  invoiceId: number;
  invoiceNo: string;
  date: Date;
  taxType: "CGST_SGST" | "IGST";
  totalTaxable: number;
  cgstAmt: number;
  sgstAmt: number;
  igstAmt: number;
  grandTotal: number;
};

export async function postInvoice(tx: Tx, p: InvoicePostInput) {
  // Dr Sundry Debtors  grandTotal
  // Cr Sales           totalTaxable
  // Cr GST Output ...  tax legs
  const legs: Leg[] = [
    { code: "1100", debit: p.grandTotal },
    { code: "4000", credit: p.totalTaxable },
  ];
  if (p.taxType === "CGST_SGST") {
    if (p.cgstAmt > 0) legs.push({ code: "2100", credit: p.cgstAmt });
    if (p.sgstAmt > 0) legs.push({ code: "2110", credit: p.sgstAmt });
  } else if (p.igstAmt > 0) {
    legs.push({ code: "2120", credit: p.igstAmt });
  }
  return postEntry(tx, {
    date: p.date,
    narration: `Sales invoice ${p.invoiceNo}`,
    refType: "INVOICE",
    refId: p.invoiceId,
    legs,
  });
}

export type PurchasePostInput = {
  purchaseId: number;
  purchaseNo: string;
  date: Date;
  taxType: "CGST_SGST" | "IGST";
  totalTaxable: number;
  cgstAmt: number;
  sgstAmt: number;
  igstAmt: number;
  grandTotal: number;
};

export async function postPurchase(tx: Tx, p: PurchasePostInput) {
  // Dr Purchases       totalTaxable
  // Dr GST Input ...   tax legs
  // Cr Sundry Creditors grandTotal
  const legs: Leg[] = [{ code: "5000", debit: p.totalTaxable }];
  if (p.taxType === "CGST_SGST") {
    if (p.cgstAmt > 0) legs.push({ code: "1300", debit: p.cgstAmt });
    if (p.sgstAmt > 0) legs.push({ code: "1310", debit: p.sgstAmt });
  } else if (p.igstAmt > 0) {
    legs.push({ code: "1320", debit: p.igstAmt });
  }
  legs.push({ code: "2000", credit: p.grandTotal });
  return postEntry(tx, {
    date: p.date,
    narration: `Purchase ${p.purchaseNo}`,
    refType: "PURCHASE",
    refId: p.purchaseId,
    legs,
  });
}

export type SalesReturnPostInput = {
  salesReturnId: number;
  returnNo: number;
  invoiceNo: string;
  date: Date;
  taxType: "CGST_SGST" | "IGST";
  totalTaxable: number;
  totalTax: number;
  totalCredit: number;
};

export async function postSalesReturn(tx: Tx, p: SalesReturnPostInput) {
  // Dr Sales Returns         totalTaxable
  // Dr GST Output (reversal) totalTax
  // Cr Sundry Debtors        totalCredit
  const half = r2(p.totalTax / 2);
  const legs: Leg[] = [{ code: "4100", debit: p.totalTaxable }];
  if (p.taxType === "CGST_SGST") {
    if (half > 0) legs.push({ code: "2100", debit: half });
    if (p.totalTax - half > 0)
      legs.push({ code: "2110", debit: r2(p.totalTax - half) });
  } else if (p.totalTax > 0) {
    legs.push({ code: "2120", debit: p.totalTax });
  }
  legs.push({ code: "1100", credit: p.totalCredit });
  return postEntry(tx, {
    date: p.date,
    narration: `Sales return #${p.returnNo} of ${p.invoiceNo}`,
    refType: "SALES_RETURN",
    refId: p.salesReturnId,
    legs,
  });
}

export type PurchaseReturnPostInput = {
  purchaseReturnId: number;
  returnNo: number;
  purchaseNo: string;
  date: Date;
  taxType: "CGST_SGST" | "IGST";
  totalTaxable: number;
  totalTax: number;
  totalDebit: number;
};

export async function postPurchaseReturn(tx: Tx, p: PurchaseReturnPostInput) {
  // Dr Sundry Creditors    totalDebit
  // Cr Purchase Returns    totalTaxable
  // Cr GST Input (reverse) totalTax
  const half = r2(p.totalTax / 2);
  const legs: Leg[] = [
    { code: "2000", debit: p.totalDebit },
    { code: "5100", credit: p.totalTaxable },
  ];
  if (p.taxType === "CGST_SGST") {
    if (half > 0) legs.push({ code: "1300", credit: half });
    if (p.totalTax - half > 0)
      legs.push({ code: "1310", credit: r2(p.totalTax - half) });
  } else if (p.totalTax > 0) {
    legs.push({ code: "1320", credit: p.totalTax });
  }
  return postEntry(tx, {
    date: p.date,
    narration: `Purchase return #${p.returnNo} of ${p.purchaseNo}`,
    refType: "PURCHASE_RETURN",
    refId: p.purchaseReturnId,
    legs,
  });
}
