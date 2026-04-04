import { Request, Response } from "express";
import prisma from "../utils/prisma";

const r2 = (v: number) => Math.round(v * 100) / 100;

export const saleRegister = async (req: Request, res: Response) => {
  try {
    const { from, to, customerId } = req.query;

    const invoices = await prisma.invoice.findMany({
      where: {
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
      include: {
        customer: true,
        agent: true,
      },
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
      include: {
        customer: true,
      },
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
      include: {
        item: {
          include: {
            hsn: true,
          },
        },
      },
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
