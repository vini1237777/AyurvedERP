import { Router } from 'express'
import * as c from '../controllers/customer.controller'
const r = Router()
r.get('/', c.getAll)
r.get('/search', c.search)
r.get('/:id', c.getById)
r.post('/', c.create)
r.put('/:id', c.update)
r.delete('/:id', c.remove)
export default r
