import { Request, Response } from 'express'
import prisma from '../utils/prisma'
import { cache } from '../utils/cache'

const ITEMS_CACHE_KEY = 'items:list:v1'

export const getAll = async (req: Request, res: Response) => {
  try {
    const { itemId, page, limit } = req.query
    const where = itemId ? { itemId: parseInt(String(itemId)) } : {}

    const slimItemSelect = { id: true, name: true, unit: true } as const

    if (itemId) {
      const batches = await prisma.batch.findMany({
        where,
        include: { item: { select: slimItemSelect } },
        orderBy: { createdAt: 'desc' },
      })
      return res.json(batches)
    }

    const requestedLimit =
      limit !== undefined ? parseInt(String(limit), 10) : 50
    const limitNum = Number.isFinite(requestedLimit) ? requestedLimit : 50
    const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1)

    if (limitNum > 0) {
      const [rows, total] = await Promise.all([
        prisma.batch.findMany({
          where,
          include: { item: { select: slimItemSelect } },
          orderBy: { createdAt: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
        prisma.batch.count({ where }),
      ])
      return res.json({
        rows,
        total,
        page: pageNum,
        limit: limitNum,
        hasMore: pageNum * limitNum < total,
      })
    }

    const batches = await prisma.batch.findMany({
      where,
      include: { item: { select: slimItemSelect } },
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
    await cache.del(ITEMS_CACHE_KEY)
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
    await cache.del(ITEMS_CACHE_KEY)
    res.json(batch)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update batch' })
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    await prisma.batch.delete({ where: { id: parseInt(req.params.id) } })
    await cache.del(ITEMS_CACHE_KEY)
    res.json({ message: 'Batch deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete batch' })
  }
}
