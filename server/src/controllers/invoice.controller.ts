import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma";
import { cache } from "../utils/cache";
import {
  postInvoice,
  postSalesReturn,
  reverseEntriesFor,
} from "../services/posting.service";
import { checkSaleLine } from "../services/saleLines";

const ITEMS_CACHE_KEY = "items:list:v1";
const DASHBOARD_CACHE_KEY = "dashboard:summary:v1";
const MAX_INVOICE_NO_ATTEMPTS = 5;

class InsufficientStockError extends Error {}

const r2 = (v: number) => Math.round(v * 100) / 100;

function getCurrentFY(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (m >= 4) return `20${String(y).slice(2)}-${String(y + 1).slice(2)}`;
  return `20${String(y - 1).slice(2)}-${String(y).slice(2)}`;
}

async function getNextInvoiceNo(
  db: Prisma.TransactionClient = prisma,
): Promise<string> {
  const faInvoices = await db.invoice.findMany({
    where: { invoiceNo: { startsWith: "FA-" } },
    select: { invoiceNo: true },
  });
  if (!faInvoices.length) return "FA-01";
  const maxNum = Math.max(
    ...faInvoices.map((i) => parseInt(i.invoiceNo.replace("FA-", ""), 10) || 0),
  );
  return `FA-${String(maxNum + 1).padStart(2, "0")}`;
}

function isInvoiceNoCollision(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    String(err.meta?.target).includes("invoiceNo")
  );
}

// Two sales of different batches can read the same highest number. The unique
// index rejects the slower one, so run its whole transaction again. A sequence
// would avoid this but would leave gaps in GST invoice numbers after a rollback.
async function retryOnInvoiceNoCollision<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (err) {
      if (!isInvoiceNoCollision(err) || attempt >= MAX_INVOICE_NO_ATTEMPTS)
        throw err;
      await new Promise((r) => setTimeout(r, Math.random() * 50 * attempt));
    }
  }
}

// Takes the stock only if enough is left. Batches go in id order so that two
// invoices sharing batches always lock them in the same order and can't deadlock.
async function deductStock(tx: Prisma.TransactionClient, rows: any[]) {
  const wanted = new Map<number, { qty: number; itemName: string }>();
  for (const row of rows) {
    if (!row.batchId) continue;
    const batchId = parseInt(row.batchId);
    const qty = (parseFloat(row.qty) || 0) + (parseFloat(row.freeQty) || 0);
    const entry = wanted.get(batchId);
    if (entry) entry.qty += qty;
    else wanted.set(batchId, { qty, itemName: row.itemName });
  }

  const batchIds = [...wanted.keys()].sort((a, b) => a - b);
  for (const batchId of batchIds) {
    const { qty, itemName } = wanted.get(batchId)!;
    const { count } = await tx.batch.updateMany({
      where: { id: batchId, currentQty: { gte: qty } },
      data: { currentQty: { decrement: qty } },
    });
    if (count === 0) {
      const batch = await tx.batch.findUnique({
        where: { id: batchId },
        select: { batchNo: true, currentQty: true },
      });
      throw new InsufficientStockError(
        `Only ${batch?.currentQty ?? 0} left of ${itemName} in batch ${batch?.batchNo ?? batchId}. Requested ${qty}.`,
      );
    }
  }
}

async function getNextReturnNo(): Promise<number> {
  const last = await prisma.salesReturn.findFirst({
    orderBy: { returnNo: "desc" },
  });
  return (last?.returnNo || 0) + 1;
}

export const getNextNo = async (_req: Request, res: Response) => {
  try {
    const invoiceNo = await getNextInvoiceNo();
    res.json({ invoiceNo });
  } catch (err) {
    res.status(500).json({ error: "Failed to get next invoice number" });
  }
};

export const getAll = async (req: Request, res: Response) => {
  try {
    const { from, to, customerId, page, limit, financialYear, q, sort } =
      req.query;
    const search = typeof q === "string" ? q.trim() : "";
    const dir = sort === "asc" ? ("asc" as const) : ("desc" as const);
  
    const requestedLimit = limit !== undefined ? parseInt(String(limit), 10) : 50;
    const limitNum = Number.isFinite(requestedLimit) ? requestedLimit : 50;
    const pageNum = Math.max(1, parseInt(String(page || "1"), 10) || 1);

    const where = {
      ...(from && to
        ? {
            invoiceDate: {
              gte: new Date(String(from)),
              lte: new Date(String(to)),
            },
          }
        : {}),
      ...(customerId ? { customerId: parseInt(String(customerId), 10) } : {}),
      ...(financialYear ? { financialYear: String(financialYear) } : {}),
      ...(search
        ? {
            OR: [
              {
                invoiceNo: { contains: search, mode: "insensitive" as const },
              },
              {
                customer: {
                  name: { contains: search, mode: "insensitive" as const },
                },
              },
            ],
          }
        : {}),
      status: { not: "CANCELLED" },
    };

    const includeForList = { customer: true, agent: true };
    const includeForAll = {
      customer: true,
      agent: true,
      items: { include: { batch: true } },
    };

    if (limitNum > 0) {
      const [rows, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          include: includeForList,
          orderBy: [{ invoiceDate: dir }, { id: dir }],
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
        prisma.invoice.count({ where }),
      ]);
      return res.json({
        data: rows,
        rows,
        total,
        page: pageNum,
        limit: limitNum,
        hasMore: pageNum * limitNum < total,
      });
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: includeForAll,
      orderBy: [{ invoiceDate: "desc" }, { id: "desc" }],
    });
    res.json(invoices);
  } catch (err) {
    console.error("getAll invoices error:", err);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        customer: true,
        agent: true,
        items: { include: { item: true, batch: true } },
      },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const { customerId, agentId, invoiceDate, dueDate, terms, rows, notes } =
      req.body;

    if (!customerId || !rows?.length)
      return res.status(400).json({ error: "Customer and items are required" });

    for (const row of rows) {
      const problem = checkSaleLine(row);
      if (problem) return res.status(400).json({ error: problem });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(customerId) },
    });
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const taxType = customer.stateCode === "27" ? "CGST_SGST" : "IGST";

    const invDate = invoiceDate ? new Date(invoiceDate) : new Date();
    const y = invDate.getFullYear();
    const m = invDate.getMonth() + 1;
    const financialYear =
      m >= 4
        ? `20${String(y).slice(2)}-${String(y + 1).slice(2)}`
        : `20${String(y - 1).slice(2)}-${String(y).slice(2)}`;

    // GST follows the item's tax slab, whatever the browser sent.
    const itemIds = [...new Set<number>(rows.map((row: any) => Number(row.itemId)))];
    const items = await prisma.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, taxSlab: { select: { rate: true } } },
    });
    const gstByItem = new Map(items.map((i) => [i.id, i.taxSlab.rate]));
    const unknown = rows.find((row: any) => !gstByItem.has(Number(row.itemId)));
    if (unknown)
      return res
        .status(400)
        .json({ error: `Item not found for ${unknown.itemName || "a line"}` });

    const calcedRows = rows.map((row: any) => {
      const rate = parseFloat(row.rate) || 0;
      const qty = parseFloat(row.qty) || 0;
      const disc = parseFloat(row.disc) || 0;
      const sDis = parseFloat(row.sDis) || 0;
      const gst = gstByItem.get(Number(row.itemId)) ?? 0;
      const basic = r2(rate * qty);
      const afterDis = r2(basic - (basic * disc) / 100);
      const taxable = r2(afterDis - (afterDis * sDis) / 100);
      const discAmt = r2(basic - taxable);
      const taxAmt = r2((taxable * gst) / 100);
      const netValue = r2(taxable + taxAmt);
      return { ...row, gst, basic, discAmt, taxable, taxAmt, netValue };
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

    for (const row of calcedRows) {
      if (row.batchId) {
        const batch = await prisma.batch.findUnique({
          where: { id: parseInt(row.batchId) },
        });
        if (!batch)
          return res
            .status(400)
            .json({ error: `Batch not found for ${row.itemName}` });
      }
    }

    const invoice = await retryOnInvoiceNoCollision(() => prisma.$transaction(async (tx) => {
      // Stock comes first: a buyer who loses the race leaves without using a
      // number, and sales of one batch are in order by the time they read it.
      await deductStock(tx, calcedRows);
      const invoiceNo = await getNextInvoiceNo(tx);

      const inv = await tx.invoice.create({
        data: {
          invoiceNo,
          financialYear,
          invoiceDate: new Date(invoiceDate),
          dueDate: dueDate ? new Date(dueDate) : null,
          terms: terms || "Credit",
          notes: typeof notes === "string" ? notes.trim() || null : null,
          customerId: parseInt(customerId),
          agentId: agentId ? parseInt(agentId) : null,
          customerGstin: customer.gstin,
          customerState: customer.state,
          customerStateCode: customer.stateCode,
          taxType,
          totalDiscount,
          totalTaxable,
          cgstAmt,
          sgstAmt,
          igstAmt,
          totalTax,
          grandTotal,
          items: {
            create: calcedRows.map((row: any) => ({
              itemId: parseInt(row.itemId),
              batchId: row.batchId ? parseInt(row.batchId) : null,
              itemName: row.itemName,
              hsnCode: row.hsn || "",
              mrp: parseFloat(row.mrp) || null,
              rate: parseFloat(row.rate) || 0,
              qty: parseFloat(row.qty) || 0,
              altQty: parseFloat(row.altQty) || 0,
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
        include: { customer: true, items: true },
      });

      await postInvoice(tx, {
        invoiceId: inv.id,
        invoiceNo: inv.invoiceNo,
        date: inv.invoiceDate,
        taxType: taxType as "CGST_SGST" | "IGST",
        totalTaxable,
        cgstAmt,
        sgstAmt,
        igstAmt,
        grandTotal,
      });

      return inv;
    }, { timeout: 20000, maxWait: 10000 }));

    // After commit, so the next read rebuilds from the new stock. A read already
    // in flight can still cache the old stock, until the key's TTL runs out.
    await Promise.all([
      cache.del(ITEMS_CACHE_KEY),
      cache.del(DASHBOARD_CACHE_KEY),
    ]);

    res.status(201).json(invoice);
  } catch (err: any) {
    if (err instanceof InsufficientStockError)
      return res.status(409).json({ error: err.message });
    if (isInvoiceNoCollision(err))
      return res
        .status(503)
        .json({ error: "Billing is busy right now. Please save again." });
    console.error(err);
    res.status(500).json({ error: "Failed to create invoice" });
  }
};

export const createReturn = async (req: Request, res: Response) => {
  try {
    const invoiceId = parseInt(req.params.id, 10);
    const { items, reason } = req.body;

    if (!invoiceId || Number.isNaN(invoiceId))
      return res.status(400).json({ error: "Invalid invoice id" });
    if (!Array.isArray(items) || !items.length)
      return res.status(400).json({ error: "Return items are required" });

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true, customer: true },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (invoice.status === "CANCELLED")
      return res
        .status(400)
        .json({ error: "Cancelled invoice cannot be returned" });

    const invoiceItemsMap = new Map(invoice.items.map((x) => [x.id, x]));
    const returnNo = await getNextReturnNo();
    let totalTaxable = 0,
      totalTax = 0;

    const createdReturn = await prisma.$transaction(async (tx) => {
      const returnRows: any[] = [];

      for (const row of items) {
        const invoiceItemId = Number(row.invoiceItemId);
        const qty = Number(row.qty) || 0;
        const invItem = invoiceItemsMap.get(invoiceItemId);
        if (!invItem)
          throw new Error(`Invoice item ${row.invoiceItemId} not found`);
        if (qty <= 0)
          throw new Error(`Invalid return qty for ${invItem.itemName}`);

        const alreadyReturned = Number(invItem.returnedQty || 0);
        const available = Number(invItem.qty) - alreadyReturned;
        if (qty > available)
          throw new Error(
            `Return qty exceeds available qty for ${invItem.itemName}. Available: ${available}`,
          );

        const taxableAmt = r2(
          Number(invItem.rate) *
            qty *
            (1 - Number(invItem.discPercent || 0) / 100),
        );
        const taxAmt = r2((taxableAmt * Number(invItem.gstPercent || 0)) / 100);
        const netValue = r2(taxableAmt + taxAmt);
        totalTaxable += taxableAmt;
        totalTax += taxAmt;

        await tx.invoiceItem.update({
          where: { id: invItem.id },
          data: { returnedQty: { increment: qty } },
        });
        if (invItem.batchId)
          await tx.batch.update({
            where: { id: invItem.batchId },
            data: { currentQty: { increment: qty } },
          });

        returnRows.push({
          invoiceItemId: invItem.id,
          qty,
          rate: Number(invItem.rate),
          discPercent: Number(invItem.discPercent || 0),
          gstPercent: Number(invItem.gstPercent || 0),
          taxableAmt,
          taxAmt,
          netValue,
        });
      }

      const sr = await tx.salesReturn.create({
        data: {
          returnNo,
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          reason: reason || null,
          totalTaxable: r2(totalTaxable),
          totalTax: r2(totalTax),
          totalCredit: r2(totalTaxable + totalTax),
          items: { create: returnRows },
        },
        include: { customer: true, invoice: true, items: true },
      });

      await postSalesReturn(tx, {
        salesReturnId: sr.id,
        returnNo: sr.returnNo,
        invoiceNo: invoice.invoiceNo,
        date: sr.createdAt,
        taxType: invoice.taxType as "CGST_SGST" | "IGST",
        totalTaxable: r2(totalTaxable),
        totalTax: r2(totalTax),
        totalCredit: r2(totalTaxable + totalTax),
      });

      return sr;
    }, { timeout: 20000, maxWait: 10000 });

    return res.status(201).json({
      success: true,
      message: "Sales return processed",
      data: createdReturn,
    });
  } catch (err: any) {
    console.error("createReturn error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to process return" });
  }
};

export const getAllReturns = async (_req: Request, res: Response) => {
  try {
    const returns = await prisma.salesReturn.findMany({
      include: { customer: true, invoice: true, items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(returns);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sales returns" });
  }
};

export const getReturnById = async (req: Request, res: Response) => {
  try {
    const salesReturn = await prisma.salesReturn.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        customer: true,
        invoice: true,
        items: { include: { invoiceItem: true } },
      },
    });
    if (!salesReturn)
      return res.status(404).json({ error: "Sales return not found" });
    res.json(salesReturn);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sales return" });
  }
};

export const cancel = async (req: Request, res: Response) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { items: true },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (invoice.status === "CANCELLED")
      return res.status(400).json({ error: "Already cancelled" });

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: "CANCELLED" },
      });
      for (const item of invoice.items) {
        if (item.batchId) {
          await tx.batch.update({
            where: { id: item.batchId },
            data: { currentQty: { increment: item.qty + item.freeQty } },
          });
        }
      }
      await reverseEntriesFor(
        tx,
        "INVOICE",
        invoice.id,
        `Cancellation of invoice ${invoice.invoiceNo}`,
      );
    }, { timeout: 20000, maxWait: 10000 });

    res.json({ message: "Invoice cancelled and stock reversed" });
  } catch (err) {
    res.status(500).json({ error: "Failed to cancel invoice" });
  }
};
