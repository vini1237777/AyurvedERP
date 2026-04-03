import { Router } from 'express'
import * as b from '../controllers/batch.controller'
const r = Router()
r.get('/', b.getAll)
r.post('/', b.create)
r.put('/:id', b.update)
r.delete('/:id', b.remove)
export default r
