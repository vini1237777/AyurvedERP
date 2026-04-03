import { Request, Response } from 'express'
import prisma from '../utils/prisma'

export const getAll = async (_req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
    res.json(customers)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers' })
  }
}

export const getById = async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(req.params.id) },
    })
    if (!customer) return res.status(404).json({ error: 'Customer not found' })
    res.json(customer)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer' })
  }
}

export const create = async (req: Request, res: Response) => {
  try {
    const { name, gstin, pan, dlNo, state, stateCode, address, city, pincode, mobile, phone, email } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })

    // Validate GSTIN format if provided
    if (gstin) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
      if (!gstinRegex.test(gstin)) {
        return res.status(400).json({ error: 'Invalid GSTIN format' })
      }
    }

    const customer = await prisma.customer.create({
      data: { name, gstin, pan, dlNo, state: state || 'Maharashtra', stateCode: stateCode || '27', address, city, pincode, mobile, phone, email },
    })
    res.status(201).json(customer)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create customer' })
  }
}

export const update = async (req: Request, res: Response) => {
  try {
    const { name, gstin, pan, dlNo, state, stateCode, address, city, pincode, mobile, phone, email } = req.body

    if (gstin) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
      if (!gstinRegex.test(gstin)) {
        return res.status(400).json({ error: 'Invalid GSTIN format' })
      }
    }

    const customer = await prisma.customer.update({
      where: { id: parseInt(req.params.id) },
      data: { name, gstin, pan, dlNo, state, stateCode, address, city, pincode, mobile, phone, email },
    })
    res.json(customer)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update customer' })
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    await prisma.customer.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: false },
    })
    res.json({ message: 'Customer deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete customer' })
  }
}

export const search = async (req: Request, res: Response) => {
  try {
    const { q } = req.query
    const customers = await prisma.customer.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: String(q), mode: 'insensitive' } },
          { gstin: { contains: String(q), mode: 'insensitive' } },
          { mobile: { contains: String(q) } },
        ],
      },
      take: 20,
      orderBy: { name: 'asc' },
    })
    res.json(customers)
  } catch (err) {
    res.status(500).json({ error: 'Failed to search customers' })
  }
}
