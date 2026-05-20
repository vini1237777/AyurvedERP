import { Request, Response } from "express";
import prisma from "../utils/prisma";

const r2 = (v: number) => Math.round(v * 100) / 100;

export const saleRegister = async (req: Request, res: Response) => {
  try {
    const { from, to, customerId } = req.query;
    const invoices = await prisma.invoice.findMany({
      where: {
        status: { not: "CANCELLED" }, // ✅ fix
        ...(from && to
          ? {
              invoiceDate: {
                gte: new Date(String(from)),
                lte: new Date(new Date(String(to)).setHours(23, 59, 59, 999)),
              },
            }
          : {}),
        ...(customerId ? { customerId: parseInt(String(customerId), 10) } : {}),
      },
      include: { customer: true, agent: true },
      orderBy: { invoiceDate: "desc" },
    });
    res.json(invoices);
  } catch (err) {
    console.error("saleRegister error:", err);
    res.status(500).json({ error: "Failed to fetch sale register" });
  }
};

export const gstReport = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const invoices = await prisma.invoice.findMany({
      where: {
        status: { not: "CANCELLED" },
        ...(from && to
          ? {
              invoiceDate: {
                gte: new Date(String(from)),
                lte: new Date(new Date(String(to)).setHours(23, 59, 59, 999)),
              },
            }
          : {}),
      },
      include: { customer: true },
      orderBy: { invoiceDate: "desc" },
    });

    const rows = invoices.map((inv) => ({
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      invoiceDate: inv.invoiceDate,
      customerName: inv.customer.name,
      customerGstin: inv.customerGstin || inv.customer.gstin || "",
      taxType: inv.taxType,
      taxableAmount: inv.totalTaxable,
      cgstAmt: inv.cgstAmt,
      sgstAmt: inv.sgstAmt,
      igstAmt: inv.igstAmt,
      totalTax: inv.totalTax,
      grandTotal: inv.grandTotal,
    }));

    const summary = {
      taxableAmount: r2(rows.reduce((s, r) => s + r.taxableAmount, 0)),
      cgstAmt: r2(rows.reduce((s, r) => s + r.cgstAmt, 0)),
      sgstAmt: r2(rows.reduce((s, r) => s + r.sgstAmt, 0)),
      igstAmt: r2(rows.reduce((s, r) => s + r.igstAmt, 0)),
      totalTax: r2(rows.reduce((s, r) => s + r.totalTax, 0)),
      grandTotal: r2(rows.reduce((s, r) => s + r.grandTotal, 0)),
    };

    res.json({ rows, summary });
  } catch (err) {
    console.error("gstReport error:", err);
    res.status(500).json({ error: "Failed to fetch GST report" });
  }
};

export const stockReport = async (_req: Request, res: Response) => {
  try {
    const batches = await prisma.batch.findMany({
      include: { item: { include: { hsn: true } } },
      orderBy: [{ item: { name: "asc" } }, { batchNo: "asc" }],
    });

    const rows = batches.map((b) => ({
      id: b.id,
      itemName: b.item.name,
      hsnCode: b.item.hsn.code,
      batchNo: b.batchNo,
      expiryDate: b.expiryDate || "",
      openingQty: b.openingQty,
      currentQty: b.currentQty,
      mrp: b.mrp || 0,
      salePrice: b.salePrice || 0,
    }));

    const summary = {
      totalBatches: rows.length,
      totalOpeningQty: r2(rows.reduce((s, r) => s + r.openingQty, 0)),
      totalCurrentQty: r2(rows.reduce((s, r) => s + r.currentQty, 0)),
    };

    res.json({ rows, summary });
  } catch (err) {
    console.error("stockReport error:", err);
    res.status(500).json({ error: "Failed to fetch stock report" });
  }
};

// ── Party-wise Ledger ─────────────────────────────────────────────────────────
export const getLedger = async (req: Request, res: Response) => {
  try {
    const { customerId, from, to } = req.query;
    if (!customerId)
      return res.status(400).json({ error: "customerId required" });

    const where: any = {
      customerId: parseInt(String(customerId)),
      status: { not: "CANCELLED" },
    };
    if (from && to) {
      where.invoiceDate = {
        gte: new Date(String(from)),
        lte: new Date(String(to)),
      };
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: { customer: true },
      orderBy: { invoiceDate: "asc" },
    });

    let balance = 0;
    const rows = invoices.map((inv) => {
      balance += inv.grandTotal;
      return {
        date: inv.invoiceDate,
        invoiceNo: inv.invoiceNo,
        type: "Invoice",
        debit: inv.grandTotal,
        credit: 0,
        balance,
      };
    });

    res.json({
      customer: invoices[0]?.customer || null,
      rows,
      closingBalance: balance,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch ledger" });
  }
};

// ── GST R1 Report ─────────────────────────────────────────────────────────────
export const getGstR1 = async (req: Request, res: Response) => {
  try {
    const { from, to, financialYear } = req.query;
    const where: any = { status: { not: "CANCELLED" } };
    if (financialYear) where.financialYear = String(financialYear);
    if (from && to)
      where.invoiceDate = {
        gte: new Date(String(from)),
        lte: new Date(String(to)),
      };

    const invoices = await prisma.invoice.findMany({
      where,
      include: { customer: true, items: true },
      orderBy: { invoiceDate: "asc" },
    });

    // B2B: registered customers
    const b2b = invoices.filter(
      (i) => i.customerGstin && i.customerGstin.length === 15,
    );
    // B2C: unregistered
    const b2c = invoices.filter(
      (i) => !i.customerGstin || i.customerGstin.length !== 15,
    );

    const summary = {
      totalInvoices: invoices.length,
      b2bCount: b2b.length,
      b2cCount: b2c.length,
      totalTaxable: invoices.reduce((s, i) => s + i.totalTaxable, 0),
      totalTax: invoices.reduce((s, i) => s + i.totalTax, 0),
      grandTotal: invoices.reduce((s, i) => s + i.grandTotal, 0),
    };

    res.json({ b2b, b2c, summary });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch GST R1" });
  }
};

// ── GST R3B Report ────────────────────────────────────────────────────────────
export const getGstR3 = async (req: Request, res: Response) => {
  try {
    const { from, to, financialYear } = req.query;
    const where: any = { status: { not: "CANCELLED" } };
    if (financialYear) where.financialYear = String(financialYear);
    if (from && to)
      where.invoiceDate = {
        gte: new Date(String(from)),
        lte: new Date(String(to)),
      };

    const invoices = await prisma.invoice.findMany({ where });

    const cgst = invoices.reduce((s, i) => s + i.cgstAmt, 0);
    const sgst = invoices.reduce((s, i) => s + i.sgstAmt, 0);
    const igst = invoices.reduce((s, i) => s + i.igstAmt, 0);
    const taxable = invoices.reduce((s, i) => s + i.totalTaxable, 0);

    res.json({
      outwardSupplies: { taxable, cgst, sgst, igst, total: cgst + sgst + igst },
      summary: {
        totalInvoices: invoices.length,
        taxable,
        cgst,
        sgst,
        igst,
        totalTax: cgst + sgst + igst,
        grandTotal: invoices.reduce((s, i) => s + i.grandTotal, 0),
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch GST R3" });
  }
};
