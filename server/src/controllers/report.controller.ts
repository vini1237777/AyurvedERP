import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { cache } from "../utils/cache";

const r2 = (v: number) => Math.round(v * 100) / 100;

export const saleRegister = async (req: Request, res: Response) => {
  try {
    const { from, to, customerId, page, limit } = req.query;
    const requestedLimit =
      limit !== undefined ? parseInt(String(limit), 10) : 50;
    const limitNum = Number.isFinite(requestedLimit) ? requestedLimit : 50;
    const pageNum = Math.max(1, parseInt(String(page || "1"), 10) || 1);

    const where = {
      status: { not: "CANCELLED" as const },
      ...(from && to
        ? {
            invoiceDate: {
              gte: new Date(String(from)),
              lte: new Date(new Date(String(to)).setHours(23, 59, 59, 999)),
            },
          }
        : {}),
      ...(customerId ? { customerId: parseInt(String(customerId), 10) } : {}),
    };

    if (limitNum > 0) {
      const [rows, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          include: { customer: true, agent: true },
          orderBy: { invoiceDate: "desc" },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
        prisma.invoice.count({ where }),
      ]);
      return res.json({
        rows,
        total,
        page: pageNum,
        limit: limitNum,
        hasMore: pageNum * limitNum < total,
      });
    }

    const invoices = await prisma.invoice.findMany({
      where,
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
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { invoiceDate: "asc" },
    });

    const b2b = invoices.filter(
      (i) => i.customerGstin && i.customerGstin.length === 15,
    );
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

export const getGstR3 = async (req: Request, res: Response) => {
  try {
    const { from, to, financialYear } = req.query;
    const invoiceWhere: any = { status: { not: "CANCELLED" } };
    const purchaseWhere: any = { status: { not: "CANCELLED" } };
    if (financialYear) {
      invoiceWhere.financialYear = String(financialYear);
      purchaseWhere.financialYear = String(financialYear);
    }
    if (from && to) {
      const range = {
        gte: new Date(String(from)),
        lte: new Date(String(to)),
      };
      invoiceWhere.invoiceDate = range;
      purchaseWhere.purchaseDate = range;
    }

    const [invoiceTotals, purchaseTotals] = await Promise.all([
      prisma.invoice.aggregate({
        where: invoiceWhere,
        _count: { _all: true },
        _sum: {
          cgstAmt: true,
          sgstAmt: true,
          igstAmt: true,
          totalTaxable: true,
          grandTotal: true,
        },
      }),
      prisma.purchase.aggregate({
        where: purchaseWhere,
        _count: { _all: true },
        _sum: {
          cgstAmt: true,
          sgstAmt: true,
          igstAmt: true,
          totalTaxable: true,
          grandTotal: true,
        },
      }),
    ]);

    const outCgst = r2(Number(invoiceTotals._sum.cgstAmt || 0));
    const outSgst = r2(Number(invoiceTotals._sum.sgstAmt || 0));
    const outIgst = r2(Number(invoiceTotals._sum.igstAmt || 0));
    const outTaxable = r2(Number(invoiceTotals._sum.totalTaxable || 0));
    const outGrand = r2(Number(invoiceTotals._sum.grandTotal || 0));

    const inCgst = r2(Number(purchaseTotals._sum.cgstAmt || 0));
    const inSgst = r2(Number(purchaseTotals._sum.sgstAmt || 0));
    const inIgst = r2(Number(purchaseTotals._sum.igstAmt || 0));
    const inTaxable = r2(Number(purchaseTotals._sum.totalTaxable || 0));
    const inGrand = r2(Number(purchaseTotals._sum.grandTotal || 0));

    const netCgst = r2(outCgst - inCgst);
    const netSgst = r2(outSgst - inSgst);
    const netIgst = r2(outIgst - inIgst);
    const netPayable = r2(netCgst + netSgst + netIgst);

    res.json({
      outwardSupplies: {
        taxable: outTaxable,
        cgst: outCgst,
        sgst: outSgst,
        igst: outIgst,
        total: r2(outCgst + outSgst + outIgst),
      },
      itc: {
        taxable: inTaxable,
        cgst: inCgst,
        sgst: inSgst,
        igst: inIgst,
        total: r2(inCgst + inSgst + inIgst),
      },
      netPayable: {
        cgst: Math.max(0, netCgst),
        sgst: Math.max(0, netSgst),
        igst: Math.max(0, netIgst),
        total: Math.max(0, netPayable),
      },
      summary: {
        totalInvoices: invoiceTotals._count._all,
        totalPurchases: purchaseTotals._count._all,
        taxable: outTaxable,
        cgst: outCgst,
        sgst: outSgst,
        igst: outIgst,
        totalTax: r2(outCgst + outSgst + outIgst),
        grandTotal: outGrand,
        purchaseTaxable: inTaxable,
        purchaseTax: r2(inCgst + inSgst + inIgst),
        purchaseGrandTotal: inGrand,
        netPayable: Math.max(0, netPayable),
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch GST R3" });
  }
};

export const getTrialBalance = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const dateFilter =
      from && to
        ? {
            entryDate: {
              gte: new Date(String(from)),
              lte: new Date(new Date(String(to)).setHours(23, 59, 59, 999)),
            },
          }
        : {};

    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });

    const lines = await prisma.journalLine.findMany({
      where: { entry: dateFilter },
      select: { accountId: true, debit: true, credit: true },
    });

    const byAccount = new Map<number, { debit: number; credit: number }>();
    for (const l of lines) {
      const cur = byAccount.get(l.accountId) || { debit: 0, credit: 0 };
      cur.debit += l.debit;
      cur.credit += l.credit;
      byAccount.set(l.accountId, cur);
    }

    const rows = accounts
      .map((a) => {
        const totals = byAccount.get(a.id) || { debit: 0, credit: 0 };
        const debit = r2(totals.debit);
        const credit = r2(totals.credit);
        return {
          code: a.code,
          name: a.name,
          type: a.type,
          debit,
          credit,
          balance: r2(debit - credit),
        };
      })
      .filter((r) => r.debit !== 0 || r.credit !== 0);

    const totalDebit = r2(rows.reduce((s, r) => s + r.debit, 0));
    const totalCredit = r2(rows.reduce((s, r) => s + r.credit, 0));

    res.json({
      rows,
      totalDebit,
      totalCredit,
      balanced: totalDebit === totalCredit,
      difference: r2(totalDebit - totalCredit),
    });
  } catch (err) {
    console.error("trial balance error:", err);
    res.status(500).json({ error: "Failed to compute trial balance" });
  }
};

export const getProfitLoss = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const dateFilter =
      from && to
        ? {
            entryDate: {
              gte: new Date(String(from)),
              lte: new Date(new Date(String(to)).setHours(23, 59, 59, 999)),
            },
          }
        : {};

    const accounts = await prisma.account.findMany({
      where: { type: { in: ["INCOME", "EXPENSE"] }, isActive: true },
      orderBy: { code: "asc" },
    });

    const lines = await prisma.journalLine.findMany({
      where: { entry: dateFilter, accountId: { in: accounts.map((a) => a.id) } },
      select: { accountId: true, debit: true, credit: true },
    });

    const byAccount = new Map<number, { debit: number; credit: number }>();
    for (const l of lines) {
      const cur = byAccount.get(l.accountId) || { debit: 0, credit: 0 };
      cur.debit += l.debit;
      cur.credit += l.credit;
      byAccount.set(l.accountId, cur);
    }

    const income: { code: string; name: string; amount: number }[] = [];
    const expense: { code: string; name: string; amount: number }[] = [];

    for (const a of accounts) {
      const t = byAccount.get(a.id) || { debit: 0, credit: 0 };
      const amount =
        a.type === "INCOME" ? r2(t.credit - t.debit) : r2(t.debit - t.credit);
      if (amount === 0) continue;
      (a.type === "INCOME" ? income : expense).push({
        code: a.code,
        name: a.name,
        amount,
      });
    }

    const totalIncome = r2(income.reduce((s, r) => s + r.amount, 0));
    const totalExpense = r2(expense.reduce((s, r) => s + r.amount, 0));
    const netProfit = r2(totalIncome - totalExpense);

    res.json({ income, expense, totalIncome, totalExpense, netProfit });
  } catch (err) {
    console.error("p&l error:", err);
    res.status(500).json({ error: "Failed to compute P&L" });
  }
};

export const getJournal = async (req: Request, res: Response) => {
  try {
    const { from, to, refType, limit } = req.query;
    const where: any = {};
    if (from && to) {
      where.entryDate = {
        gte: new Date(String(from)),
        lte: new Date(new Date(String(to)).setHours(23, 59, 59, 999)),
      };
    }
    if (refType) where.refType = String(refType);

    const entries = await prisma.journalEntry.findMany({
      where,
      include: { lines: { include: { account: true } } },
      orderBy: { entryDate: "desc" },
      take: limit ? parseInt(String(limit), 10) : 200,
    });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch journal" });
  }
};

export const getHsnSummary = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const dateFilter =
      from && to
        ? {
            invoiceDate: {
              gte: new Date(String(from)),
              lte: new Date(new Date(String(to)).setHours(23, 59, 59, 999)),
            },
          }
        : {};

    const items = await prisma.invoiceItem.findMany({
      where: {
        invoice: { status: { not: "CANCELLED" }, ...dateFilter },
      },
      select: {
        hsnCode: true,
        gstPercent: true,
        qty: true,
        taxableAmt: true,
        taxAmt: true,
        netValue: true,
        invoice: { select: { id: true, taxType: true } },
      },
    });

    type Row = {
      hsnCode: string;
      description: string;
      gstPercent: number;
      totalQty: number;
      taxable: number;
      cgst: number;
      sgst: number;
      igst: number;
      total: number;
      invoiceIds: Set<number>;
    };
    const map = new Map<string, Row>();
    for (const it of items) {
      const key = `${it.hsnCode}::${it.gstPercent}`;
      const row = map.get(key) || {
        hsnCode: it.hsnCode,
        description: "",
        gstPercent: it.gstPercent,
        totalQty: 0,
        taxable: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        total: 0,
        invoiceIds: new Set<number>(),
      };
      row.totalQty += it.qty;
      row.taxable += it.taxableAmt;
      row.total += it.netValue;
      if (it.invoice.taxType === "CGST_SGST") {
        const half = it.taxAmt / 2;
        row.cgst += half;
        row.sgst += half;
      } else {
        row.igst += it.taxAmt;
      }
      row.invoiceIds.add(it.invoice.id);
      map.set(key, row);
    }

    const codes = Array.from(new Set(items.map((i) => i.hsnCode)));
    const hsnDescriptions =
      codes.length > 0
        ? await prisma.hsnCode.findMany({
            where: { code: { in: codes } },
            select: { code: true, description: true },
          })
        : [];
    const descByCode = new Map(
      hsnDescriptions.map((h) => [h.code, h.description || ""]),
    );

    const rows = Array.from(map.values())
      .map((r) => ({
        hsnCode: r.hsnCode,
        description: descByCode.get(r.hsnCode) || "",
        gstPercent: r.gstPercent,
        totalQty: r2(r.totalQty),
        taxable: r2(r.taxable),
        cgst: r2(r.cgst),
        sgst: r2(r.sgst),
        igst: r2(r.igst),
        total: r2(r.total),
        invoiceCount: r.invoiceIds.size,
      }))
      .sort(
        (a, b) =>
          a.hsnCode.localeCompare(b.hsnCode) || a.gstPercent - b.gstPercent,
      );

    const summary = {
      hsnCount: rows.length,
      totalTaxable: r2(rows.reduce((s, r) => s + r.taxable, 0)),
      totalCgst: r2(rows.reduce((s, r) => s + r.cgst, 0)),
      totalSgst: r2(rows.reduce((s, r) => s + r.sgst, 0)),
      totalIgst: r2(rows.reduce((s, r) => s + r.igst, 0)),
      totalTax: r2(
        rows.reduce((s, r) => s + r.cgst + r.sgst + r.igst, 0),
      ),
      grandTotal: r2(rows.reduce((s, r) => s + r.total, 0)),
    };

    res.json({ rows, summary });
  } catch (err: any) {
    console.error("hsn summary error:", err);
    res.status(500).json({ error: "Failed to compute HSN summary" });
  }
};

function parseExpiry(s: string | null): Date | null {
  if (!s) return null;
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return new Date(+ymd[1], +ymd[2] - 1, +ymd[3]);
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dmy) {
    const y = +dmy[3] < 100 ? 2000 + +dmy[3] : +dmy[3];
    return new Date(y, +dmy[2] - 1, +dmy[1]);
  }
  const my = s.match(/^(\d{1,2})\/(\d{2,4})$/);
  if (my) {
    const y = +my[2] < 100 ? 2000 + +my[2] : +my[2];
    return new Date(y, +my[1], 0);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

const LOW_STOCK_THRESHOLD = 10;
const EXPIRY_WINDOW_DAYS = 90;

export const getDashboardSummary = async (_req: Request, res: Response) => {
  try {
    const cached = await cache.get<any>("dashboard:summary:v1");
    if (cached) return res.json(cached);

    const now = new Date();
    const expiryCutoff = new Date(now);
    expiryCutoff.setDate(expiryCutoff.getDate() + EXPIRY_WINDOW_DAYS);
    const GST_OUTPUT = ["2100", "2110", "2120"];
    const GST_INPUT = ["1300", "1310", "1320"];

    const [
      outstandingAgg,
      lowStockBatches,
      allBatches,
      gstResult,
      topCustomersResult,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        _sum: { grandTotal: true },
        where: { status: "SAVED" },
      }),
      prisma.batch.findMany({
        where: { currentQty: { lt: LOW_STOCK_THRESHOLD } },
        include: { item: { select: { id: true, name: true, unit: true } } },
        orderBy: { currentQty: "asc" },
        take: 50,
      }),
      prisma.batch.findMany({
        where: { currentQty: { gt: 0 }, expiryDate: { not: null } },
        include: { item: { select: { id: true, name: true } } },
      }),
      (async () => {
        const accounts = await prisma.account.findMany({
          where: { code: { in: [...GST_OUTPUT, ...GST_INPUT] } },
          select: { id: true, code: true },
        });
        const accountIds = accounts.map((a) => a.id);
        const lines =
          accountIds.length > 0
            ? await prisma.journalLine.findMany({
                where: { accountId: { in: accountIds } },
                select: { accountId: true, debit: true, credit: true },
              })
            : [];
        return { accounts, lines };
      })(),
      (async () => {
        const raw = await prisma.invoice.groupBy({
          by: ["customerId"],
          where: { status: "SAVED" },
          _sum: { grandTotal: true },
          orderBy: { _sum: { grandTotal: "desc" } },
          take: 5,
        });
        const ids = raw.map((r) => r.customerId);
        const names = ids.length
          ? await prisma.customer.findMany({
              where: { id: { in: ids } },
              select: { id: true, name: true },
            })
          : [];
        return { raw, names };
      })(),
    ]);

    const outstanding = r2(outstandingAgg._sum.grandTotal || 0);

    const lowStock = lowStockBatches.map((b) => ({
      itemId: b.item.id,
      itemName: b.item.name,
      batchNo: b.batchNo,
      currentQty: b.currentQty,
      unit: b.item.unit,
    }));

    const expiring = allBatches
      .map((b) => ({ b, exp: parseExpiry(b.expiryDate) }))
      .filter(
        (x): x is { b: typeof allBatches[number]; exp: Date } =>
          x.exp !== null && x.exp <= expiryCutoff,
      )
      .sort((a, b) => a.exp.getTime() - b.exp.getTime())
      .slice(0, 50)
      .map(({ b, exp }) => ({
        itemId: b.item.id,
        itemName: b.item.name,
        batchNo: b.batchNo,
        expiryDate: exp.toISOString().slice(0, 10),
        currentQty: b.currentQty,
      }));

    const codeOf = new Map(gstResult.accounts.map((a) => [a.id, a.code]));
    let output = 0;
    let input = 0;
    for (const l of gstResult.lines) {
      const code = codeOf.get(l.accountId);
      if (!code) continue;
      if (GST_OUTPUT.includes(code)) output += l.credit - l.debit;
      else input += l.debit - l.credit;
    }
    const gstPayable = r2(output - input);

    const custName = new Map(
      topCustomersResult.names.map((c) => [c.id, c.name]),
    );
    const topCustomers = topCustomersResult.raw.map((r) => ({
      customerId: r.customerId,
      name: custName.get(r.customerId) || "(unknown)",
      total: r2(r._sum.grandTotal || 0),
    }));

    const payload = {
      outstanding,
      lowStock,
      lowStockCount: lowStock.length,
      expiring,
      expiringCount: expiring.length,
      gstPayable,
      gstOutput: r2(output),
      gstInput: r2(input),
      topCustomers,
    };
    void cache.set("dashboard:summary:v1", payload, 30);
    res.json(payload);
  } catch (err: any) {
    console.error("dashboard summary error:", err);
    res.status(500).json({ error: "Failed to compute dashboard summary" });
  }
};
