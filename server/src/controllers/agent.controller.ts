import { Request, Response } from 'express'
import prisma from '../utils/prisma'

export const agentGetAll = async (_req: Request, res: Response) => {
  try {
    const agents = await prisma.agent.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
    res.json(agents)
  } catch { res.status(500).json({ error: 'Failed to fetch agents' }) }
}

export const agentCreate = async (req: Request, res: Response) => {
  try {
    const { name, mobile } = req.body
    if (!name) return res.status(400).json({ error: 'Name required' })
    const agent = await prisma.agent.create({ data: { name, mobile } })
    res.status(201).json(agent)
  } catch { res.status(500).json({ error: 'Failed to create agent' }) }
}

export const agentUpdate = async (req: Request, res: Response) => {
  try {
    const agent = await prisma.agent.update({ where: { id: parseInt(req.params.id) }, data: req.body })
    res.json(agent)
  } catch { res.status(500).json({ error: 'Failed to update agent' }) }
}

export const agentDelete = async (req: Request, res: Response) => {
  try {
    await prisma.agent.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } })
    res.json({ message: 'Agent deleted' })
  } catch { res.status(500).json({ error: 'Failed to delete agent' }) }
}

export const hsnGetAll = async (_req: Request, res: Response) => {
  try {
    const hsns = await prisma.hsnCode.findMany({ orderBy: { code: 'asc' } })
    res.json(hsns)
  } catch { res.status(500).json({ error: 'Failed to fetch HSN codes' }) }
}

export const hsnCreate = async (req: Request, res: Response) => {
  try {
    const { code, description, gstRate } = req.body
    if (!code || gstRate === undefined) return res.status(400).json({ error: 'Code and GST rate required' })
    const hsn = await prisma.hsnCode.create({ data: { code, description, gstRate: parseFloat(gstRate) } })
    res.status(201).json(hsn)
  } catch { res.status(500).json({ error: 'Failed to create HSN' }) }
}

export const taxSlabGetAll = async (_req: Request, res: Response) => {
  try {
    const slabs = await prisma.taxSlab.findMany({ orderBy: { rate: 'asc' } })
    res.json(slabs)
  } catch { res.status(500).json({ error: 'Failed to fetch tax slabs' }) }
}
