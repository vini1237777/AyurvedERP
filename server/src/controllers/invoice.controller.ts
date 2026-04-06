import { Request, Response } from "express";
import prisma from "../utils/prisma";

const r2 = (v: number) => Math.round(v * 100) / 100;

function getCurrentFY(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (m >= 4) return `20${String(y).slice(2)}-${String(y + 1).slice(2)}`;
  return `20${String(y - 1).slice(2)}-${String(y).slice(2)}`;
}

async function getNextInvoiceNo(): Promise<string> {
  const faInvoices = await prisma.invoice.findMany({
    where: { invoiceNo: { startsWith: "FA-" } },
    select: { invoiceNo: true },
  });
  if (!faInvoices.length) return "FA-01";
  const maxNum = Math.max(
    ...faInvoices.map((i) => parseInt(i.invoiceNo.replace("FA-", ""), 10) || 0),
  );
  return `FA-${String(maxNum + 1).padStart(2, "0")}`;
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
    const { from, to, customerId, page, limit, financialYear } = req.query;
    const pageNum = parseInt(String(page || "1"), 10);
    const limitNum = parseInt(String(limit || "0"), 10);

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
      status: { not: "CANCELLED" },
    };

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        agent: true,
        items: { include: { batch: true } },
      },
      orderBy: { invoiceDate: "desc" },
      ...(limitNum > 0
        ? { skip: (pageNum - 1) * limitNum, take: limitNum }
        : {}),
    });

    if (limitNum > 0) {
      const total = await prisma.invoice.count({ where });
      res.json({
        data: invoices,
        total,
        page: pageNum,
        hasMore: pageNum * limitNum < total,
      });
    } else {
      res.json(invoices);
    }
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
    const { customerId, agentId, invoiceDate, dueDate, terms, rows } = req.body;

    if (!customerId || !rows?.length)
      return res.status(400).json({ error: "Customer and items are required" });

    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(customerId) },
    });
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const taxType = customer.stateCode === "27" ? "CGST_SGST" : "IGST";
    const invoiceNo = await getNextInvoiceNo();

    // Determine financial year from invoice date
    const invDate = invoiceDate ? new Date(invoiceDate) : new Date();
    const y = invDate.getFullYear();
    const m = invDate.getMonth() + 1;
    const financialYear =
      m >= 4
        ? `20${String(y).slice(2)}-${String(y + 1).slice(2)}`
        : `20${String(y - 1).slice(2)}-${String(y).slice(2)}`;

    const calcedRows = rows.map((row: any) => {
      const rate = parseFloat(row.rate) || 0;
      const qty = parseFloat(row.qty) || 0;
      const disc = parseFloat(row.disc) || 0;
      const sDis = parseFloat(row.sDis) || 0;
      const gst = parseFloat(row.gst) || 0;
      const basic = r2(rate * qty);
      const afterDis = r2(basic - (basic * disc) / 100);
      const taxable = r2(afterDis - (afterDis * sDis) / 100);
      const discAmt = r2(basic - taxable);
      const taxAmt = r2((taxable * gst) / 100);
      const netValue = r2(taxable + taxAmt);
      return { ...row, basic, discAmt, taxable, taxAmt, netValue };
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
        // Allow negative stock
      }
    }

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNo,
          financialYear,
          invoiceDate: new Date(invoiceDate),
          dueDate: dueDate ? new Date(dueDate) : null,
          terms: terms || "Credit",
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

      for (const row of calcedRows) {
        if (row.batchId) {
          const deduct =
            (parseFloat(row.qty) || 0) + (parseFloat(row.freeQty) || 0);
          await tx.batch.update({
            where: { id: parseInt(row.batchId) },
            data: { currentQty: { decrement: deduct } },
          });
        }
      }
      return inv;
    });

    res.status(201).json(invoice);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to create invoice" });
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

      return await tx.salesReturn.create({
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
    });

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
    });

    res.json({ message: "Invoice cancelled and stock reversed" });
  } catch (err) {
    res.status(500).json({ error: "Failed to cancel invoice" });
  }
};
