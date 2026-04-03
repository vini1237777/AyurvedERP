import { Router } from 'express'
import * as b from '../controllers/batch.controller'
import * as a from '../controllers/agent.controller'
import * as inv from '../controllers/invoice.controller'

// Batch routes
export const batchRouter = Router()
batchRouter.get('/', b.getAll)
batchRouter.post('/', b.create)
batchRouter.put('/:id', b.update)
batchRouter.delete('/:id', b.remove)

// Agent routes
export const agentRouter = Router()
agentRouter.get('/', a.agentGetAll)
agentRouter.post('/', a.agentCreate)
agentRouter.put('/:id', a.agentUpdate)
agentRouter.delete('/:id', a.agentDelete)

// Invoice routes
export const invoiceRouter = Router()
invoiceRouter.get('/', inv.getAll)
invoiceRouter.get('/:id', inv.getById)
invoiceRouter.post('/', inv.create)
invoiceRouter.put('/:id/cancel', inv.cancel)

// HSN routes
export const hsnRouter = Router()
hsnRouter.get('/', a.hsnGetAll)
hsnRouter.post('/', a.hsnCreate)
hsnRouter.get('/taxslabs', a.taxSlabGetAll)
