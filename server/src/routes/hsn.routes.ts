import { Router } from 'express'
import * as a from '../controllers/agent.controller'
const r = Router()
r.get('/', a.hsnGetAll)
r.post('/', a.hsnCreate)
r.get('/taxslabs', a.taxSlabGetAll)
export default r
