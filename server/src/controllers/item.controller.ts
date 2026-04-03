import { Request, Response } from "express";
import prisma from "../utils/prisma";

export const getAll = async (_req: Request, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      where: { isActive: true },
      include: { hsn: true, taxSlab: true, batches: true },
      orderBy: { name: "asc" },
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch items" });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { hsn: true, taxSlab: true, batches: true },
    });
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch item" });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const {
      name,
      shortName,
      hsnId,
      taxSlabId,
      unit,
      altUnit,
      altFactor,
      maintainBatch,
    } = req.body;

    if (!name || !hsnId) {
      return res.status(400).json({ error: "Name and HSN are required" });
    }

    // taxSlabId — use from request OR auto-derive from HSN gstRate
    let finalTaxSlabId = taxSlabId ? parseInt(taxSlabId) : null;

    if (!finalTaxSlabId) {
      const hsn = await prisma.hsnCode.findUnique({
        where: { id: parseInt(hsnId) },
      });
      if (!hsn) return res.status(400).json({ error: "HSN code not found" });

      const slab = await prisma.taxSlab.findFirst({
        where: { rate: hsn.gstRate },
      });
      if (!slab)
        return res
          .status(400)
          .json({ error: `No tax slab found for GST rate ${hsn.gstRate}%` });

      finalTaxSlabId = slab.id;
    }

    const item = await prisma.item.create({
      data: {
        name,
        shortName: shortName || null,
        hsnId: parseInt(hsnId),
        taxSlabId: finalTaxSlabId,
        unit: unit || "Pcs",
        altUnit: altUnit || null,
        altFactor: altFactor ? parseFloat(altFactor) : 1,
        maintainBatch: maintainBatch !== false,
      },
      include: { hsn: true, taxSlab: true },
    });

    res.status(201).json(item);
  } catch (err) {
    console.error("Item create error:", err);
    res.status(500).json({ error: "Failed to create item" });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const {
      name,
      shortName,
      hsnId,
      taxSlabId,
      unit,
      altUnit,
      altFactor,
      maintainBatch,
    } = req.body;

    let finalTaxSlabId = taxSlabId ? parseInt(taxSlabId) : undefined;

    // If hsnId changed but taxSlabId not sent — auto-derive
    if (hsnId && !taxSlabId) {
      const hsn = await prisma.hsnCode.findUnique({
        where: { id: parseInt(hsnId) },
      });
      if (hsn) {
        const slab = await prisma.taxSlab.findFirst({
          where: { rate: hsn.gstRate },
        });
        if (slab) finalTaxSlabId = slab.id;
      }
    }

    const item = await prisma.item.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name,
        shortName: shortName || null,
        hsnId: hsnId ? parseInt(hsnId) : undefined,
        taxSlabId: finalTaxSlabId,
        unit,
        altUnit: altUnit || null,
        altFactor: altFactor ? parseFloat(altFactor) : undefined,
        maintainBatch,
      },
      include: { hsn: true, taxSlab: true },
    });
    res.json(item);
  } catch (err) {
    console.error("Item update error:", err);
    res.status(500).json({ error: "Failed to update item" });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    await prisma.item.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: false },
    });
    res.json({ message: "Item deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete item" });
  }
};

export const search = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    const items = await prisma.item.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: String(q), mode: "insensitive" } },
          { hsn: { code: { contains: String(q) } } },
        ],
      },
      include: { hsn: true, taxSlab: true, batches: true },
      take: 20,
      orderBy: { name: "asc" },
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to search items" });
  }
};

export const getBatches = async (req: Request, res: Response) => {
  try {
    const batches = await prisma.batch.findMany({
      where: { itemId: parseInt(req.params.id) },
      orderBy: { createdAt: "desc" },
    });
    res.json(batches);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch batches" });
  }
};
