import { Request, Response } from "express";
import prisma from "../utils/prisma";
import {
  postPurchase,
  postPurchaseReturn,
  reverseEntriesFor,
} from "../services/posting.service";

const r2 = (v: number) => Math.round(v * 100) / 100;

function getFY(date: Date): string {
  const y = date.getFullYear(),
    m = date.getMonth() + 1;
  return m >= 4
    ? `${y}-${String(y + 1).slice(2)}`
    : `${y - 1}-${String(y).slice(2)}`;
}

async function getNextPurchaseNo(): Promise<string> {
  const last = await prisma.purchase.findFirst({
    where: { purchaseNo: { startsWith: "FP-" } },
    orderBy: { createdAt: "desc" },
  });
  const max = last ? parseInt(last.purchaseNo.replace("FP-", ""), 10) || 0 : 0;
  return `FP-${String(max + 1).padStart(4, "0")}`;
}

export const getAll = async (req: Request, res: Response) => {
  try {
    const { financialYear } = req.query;
    const where = financialYear ? { financialYear: String(financialYear) } : {};
    const purchases = await prisma.purchase.findMany({
      where,
      include: { supplier: true, items: { include: { batch: true } } },
      orderBy: { purchaseDate: "desc" },
    });
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch purchases" });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        supplier: true,
        items: { include: { item: true, batch: true } },
      },
    });
    if (!purchase) return res.status(404).json({ error: "Purchase not found" });
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch purchase" });
  }
};

export const getNextNo = async (_req: Request, res: Response) => {
  try {
    res.json({ purchaseNo: await getNextPurchaseNo() });
  } catch (err) {
    res.status(500).json({ error: "Failed to get next purchase number" });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const { supplierId, purchaseDate, rows, notes } = req.body;
    if (!supplierId || !rows?.length)
      return res.status(400).json({ error: "Supplier and items required" });

    const supplier = await prisma.customer.findUnique({
      where: { id: parseInt(supplierId) },
    });
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });

    const purchaseNo = await getNextPurchaseNo();
    const pDate = purchaseDate ? new Date(purchaseDate) : new Date();
    const financialYear = getFY(pDate);
    const taxType = supplier.stateCode === "27" ? "CGST_SGST" : "IGST";

    const calcedRows = rows.map((row: any) => {
      const rate = parseFloat(row.rate) || 0,
        qty = parseFloat(row.qty) || 0;
      const disc = parseFloat(row.disc) || 0,
        gst = parseFloat(row.gst) || 0;
      const basic = r2(rate * qty);
      const taxable = r2(basic - (basic * disc) / 100);
      const discAmt = r2(basic - taxable);
      const taxAmt = r2((taxable * gst) / 100);
      return {
        ...row,
        basic,
        discAmt,
        taxable,
        taxAmt,
        netValue: r2(taxable + taxAmt),
      };
    });

    const totalDiscount = r2(
      calcedRows.reduce((s: number, r: any) => s + r.discAmt, 0),
    );
    const totalTaxable = r2(
      calcedRows.reduce((s: number, r: any) => s + r.taxable, 0),
    );
    const totalTax = r2(
      calcedRows.reduce((s: number, r: any) => s + r.taxAmt, 0),
    );
    const cgstAmt = taxType === "CGST_SGST" ? r2(totalTax / 2) : 0;
    const sgstAmt = taxType === "CGST_SGST" ? r2(totalTax - cgstAmt) : 0;
    const igstAmt = taxType === "IGST" ? totalTax : 0;
    const grandTotal = r2(totalTaxable + totalTax);

    const purchase = await prisma.$transaction(async (tx) => {
      const p = await tx.purchase.create({
        data: {
          purchaseNo,
          financialYear,
          purchaseDate: pDate,
          supplierId: parseInt(supplierId),
          supplierGstin: supplier.gstin,
          supplierState: supplier.state,
          supplierStateCode: supplier.stateCode,
          taxType,
          totalDiscount,
          totalTaxable,
          cgstAmt,
          sgstAmt,
          igstAmt,
          totalTax,
          grandTotal,
          notes: typeof notes === "string" ? notes.trim() || null : null,
          items: {
            create: calcedRows.map((row: any) => ({
              itemId: parseInt(row.itemId),
              batchId: row.batchId ? parseInt(row.batchId) : null,
              itemName: row.itemName,
              hsnCode: row.hsn || "",
              mrp: parseFloat(row.mrp) || null,
              rate: parseFloat(row.rate) || 0,
              qty: parseFloat(row.qty) || 0,
              freeQty: parseFloat(row.freeQty) || 0,
              per: row.per || "Pcs",
              basicAmt: row.basic,
              discPercent: parseFloat(row.disc) || 0,
              discAmt: row.discAmt,
              taxableAmt: row.taxable,
              gstPercent: parseFloat(row.gst) || 0,
              taxAmt: row.taxAmt,
              netValue: row.netValue,
            })),
          },
        },
        include: { supplier: true, items: true },
      });

      // Update batch stock on purchase
      for (const row of calcedRows) {
        if (row.batchId) {
          const qty =
            (parseFloat(row.qty) || 0) + (parseFloat(row.freeQty) || 0);
          await tx.batch.update({
            where: { id: parseInt(row.batchId) },
            data: { currentQty: { increment: qty } },
          });
        }
      }

      await postPurchase(tx, {
        purchaseId: p.id,
        purchaseNo: p.purchaseNo,
        date: p.purchaseDate,
        taxType: taxType as "CGST_SGST" | "IGST",
        totalTaxable,
        cgstAmt,
        sgstAmt,
        igstAmt,
        grandTotal,
      });

      return p;
    }, { timeout: 20000, maxWait: 10000 });

    res.status(201).json(purchase);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to create purchase" });
  }
};

export const cancel = async (req: Request, res: Response) => {
  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { items: true },
    });
    if (!purchase) return res.status(404).json({ error: "Purchase not found" });
    if (purchase.status === "CANCELLED")
      return res.status(400).json({ error: "Already cancelled" });

    await prisma.$transaction(async (tx) => {
      await tx.purchase.update({
        where: { id: purchase.id },
        data: { status: "CANCELLED" },
      });
      for (const item of purchase.items) {
        if (item.batchId) {
          await tx.batch.update({
            where: { id: item.batchId },
            data: { currentQty: { decrement: item.qty + item.freeQty } },
          });
        }
      }
      await reverseEntriesFor(
        tx,
        "PURCHASE",
        purchase.id,
        `Cancellation of purchase ${purchase.purchaseNo}`,
      );
    }, { timeout: 20000, maxWait: 10000 });
    res.json({ message: "Purchase cancelled" });
  } catch (err) {
    res.status(500).json({ error: "Failed to cancel purchase" });
  }
};

export const getAllReturns = async (_req: Request, res: Response) => {
  try {
    const returns = await prisma.purchaseReturn.findMany({
      include: { supplier: true, purchase: true, items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(returns);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch purchase returns" });
  }
};

export const createReturn = async (req: Request, res: Response) => {
  try {
    const purchaseId = parseInt(req.params.id);
    const { items, reason } = req.body;
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { items: true },
    });
    if (!purchase) return res.status(404).json({ error: "Purchase not found" });

    const itemMap = new Map(purchase.items.map((x) => [x.id, x]));
    const last = await prisma.purchaseReturn.findFirst({
      orderBy: { returnNo: "desc" },
    });
    const returnNo = (last?.returnNo || 0) + 1;
    let totalTaxable = 0,
      totalTax = 0;

    const ret = await prisma.$transaction(async (tx) => {
      const returnRows: any[] = [];
      for (const row of items) {
        const invItem = itemMap.get(Number(row.purchaseItemId));
        if (!invItem) throw new Error(`Item not found`);
        const qty = Number(row.qty) || 0;
        const taxableAmt = r2(
          Number(invItem.rate) *
            qty *
            (1 - Number(invItem.discPercent || 0) / 100),
        );
        const taxAmt = r2((taxableAmt * Number(invItem.gstPercent || 0)) / 100);
        totalTaxable += taxableAmt;
        totalTax += taxAmt;
        if (invItem.batchId)
          await tx.batch.update({
            where: { id: invItem.batchId },
            data: { currentQty: { decrement: qty } },
          });
        returnRows.push({
          purchaseItemId: invItem.id,
          qty,
          rate: Number(invItem.rate),
          discPercent: Number(invItem.discPercent || 0),
          gstPercent: Number(invItem.gstPercent || 0),
          taxableAmt,
          taxAmt,
          netValue: r2(taxableAmt + taxAmt),
        });
      }
      const pr = await tx.purchaseReturn.create({
        data: {
          returnNo,
          purchaseId,
          supplierId: purchase.supplierId,
          reason: reason || null,
          totalTaxable: r2(totalTaxable),
          totalTax: r2(totalTax),
          totalDebit: r2(totalTaxable + totalTax),
          items: { create: returnRows },
        },
        include: { supplier: true, purchase: true, items: true },
      });

      await postPurchaseReturn(tx, {
        purchaseReturnId: pr.id,
        returnNo: pr.returnNo,
        purchaseNo: purchase.purchaseNo,
        date: pr.createdAt,
        taxType: purchase.taxType as "CGST_SGST" | "IGST",
        totalTaxable: r2(totalTaxable),
        totalTax: r2(totalTax),
        totalDebit: r2(totalTaxable + totalTax),
      });

      return pr;
    }, { timeout: 20000, maxWait: 10000 });
    res.status(201).json({ success: true, data: ret });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to process return" });
  }
};
