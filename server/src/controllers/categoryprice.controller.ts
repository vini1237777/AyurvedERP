import { Request, Response } from "express";
import prisma from "../utils/prisma";

const CATEGORIES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// ── Get all category prices for an item ──────────────────────────────────────
export const getByItem = async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const prices = await prisma.itemCategoryPrice.findMany({
      where: { itemId },
      orderBy: { category: "asc" },
    });
    // Return all A-Z with price (0 if not set)
    const result = CATEGORIES.map((cat) => {
      const found = prices.find((p) => p.category === cat);
      return { category: cat, price: found?.price ?? 0, id: found?.id ?? null };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch category prices" });
  }
};

// ── Upsert prices for an item (bulk) ─────────────────────────────────────────
export const upsertPrices = async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const { prices } = req.body; // [{ category: 'A', price: 100 }, ...]
    if (!Array.isArray(prices))
      return res.status(400).json({ error: "prices array required" });

    await prisma.$transaction(
      prices
        .filter((p) => p.price > 0)
        .map((p) =>
          prisma.itemCategoryPrice.upsert({
            where: { itemId_category: { itemId, category: p.category } },
            update: { price: parseFloat(p.price) },
            create: {
              itemId,
              category: p.category,
              price: parseFloat(p.price),
            },
          }),
        ),
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save prices" });
  }
};

// ── Customer Report: grouped by category ─────────────────────────────────────
export const customerReport = async (_req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { isActive: true, category: { not: null } },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // Group by category
    const grouped: Record<string, typeof customers> = {};
    for (const c of customers) {
      const cat = c.category || "Unassigned";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(c);
    }

    // Add unassigned
    const unassigned = await prisma.customer.findMany({
      where: { isActive: true, category: null },
      orderBy: { name: "asc" },
    });
    if (unassigned.length) grouped["Unassigned"] = unassigned;

    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch customer report" });
  }
};

// ── Item Report: all items with category prices ───────────────────────────────
export const itemReport = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    const items = await prisma.item.findMany({
      where: {
        isActive: true,
        ...(search
          ? { name: { contains: String(search), mode: "insensitive" } }
          : {}),
      },
      include: { categoryPrices: { orderBy: { category: "asc" } }, hsn: true },
      orderBy: { name: "asc" },
      take: 200,
    });

    const result = items.map((item) => ({
      id: item.id,
      name: item.name,
      hsnCode: item.hsn.code,
      unit: item.unit,
      prices: CATEGORIES.map((cat) => {
        const found = item.categoryPrices.find((p) => p.category === cat);
        return { category: cat, price: found?.price ?? 0 };
      }),
    }));

    res.json({ items: result, categories: CATEGORIES });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch item report" });
  }
};

// ── Update customer category ──────────────────────────────────────────────────
export const updateCustomerCategory = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { category } = req.body;
    const customer = await prisma.customer.update({
      where: { id },
      data: { category: category || null },
    });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: "Failed to update category" });
  }
};
