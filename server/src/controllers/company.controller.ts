import { Request, Response } from 'express'
import prisma from '../utils/prisma'

export const companyGet = async (_req: Request, res: Response) => {
  try {
    const company = await prisma.company.findFirst({ orderBy: { id: 'asc' } })
    res.json(company)
  } catch { res.status(500).json({ error: 'Failed to fetch company' }) }
}

export const companySave = async (req: Request, res: Response) => {
  try {
    const { name, address, mobile, gstin, pan, stateCode, state, bank, ifsc, account } = req.body
    if (!name) return res.status(400).json({ error: 'Name required' })
    const existing = await prisma.company.findFirst({ orderBy: { id: 'asc' } })
    const data = { name, address, mobile, gstin, pan, stateCode: stateCode || '27', state: state || 'Maharashtra', bank, ifsc, account }
    const company = existing
      ? await prisma.company.update({ where: { id: existing.id }, data })
      : await prisma.company.create({ data })
    res.json(company)
  } catch { res.status(500).json({ error: 'Failed to save company' }) }
}
