import { Request, Response } from 'express'
import prisma from '../utils/prisma'

export const getAll = async (req: Request, res: Response) => {
  try {
    const { itemId } = req.query
    const batches = await prisma.batch.findMany({
      where: itemId ? { itemId: parseInt(String(itemId)) } : undefined,
      include: { item: { include: { hsn: true, taxSlab: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(batches)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch batches' })
  }
}

export const create = async (req: Request, res: Response) => {
  try {
    const { itemId, batchNo, expiryDate, mfgDate, purchasePrice, salePrice, mrp, openingQty } = req.body
    if (!itemId || !batchNo) return res.status(400).json({ error: 'Item and Batch No required' })
    const qty = parseFloat(openingQty) || 0
    const batch = await prisma.batch.create({
      data: { itemId: parseInt(itemId), batchNo, expiryDate, mfgDate, purchasePrice: parseFloat(purchasePrice)||0, salePrice: parseFloat(salePrice)||0, mrp: parseFloat(mrp)||0, openingQty: qty, currentQty: qty },
      include: { item: true },
    })
    res.status(201).json(batch)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create batch' })
  }
}

export const update = async (req: Request, res: Response) => {
  try {
    const { batchNo, expiryDate, mfgDate, purchasePrice, salePrice, mrp, currentQty } = req.body
    const batch = await prisma.batch.update({
      where: { id: parseInt(req.params.id) },
      data: { batchNo, expiryDate, mfgDate, purchasePrice: parseFloat(purchasePrice)||undefined, salePrice: parseFloat(salePrice)||undefined, mrp: parseFloat(mrp)||undefined, currentQty: parseFloat(currentQty)||undefined },
    })
    res.json(batch)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update batch' })
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    await prisma.batch.delete({ where: { id: parseInt(req.params.id) } })
    res.json({ message: 'Batch deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete batch' })
  }
}
