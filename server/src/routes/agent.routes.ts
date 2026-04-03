import { Router } from 'express'
import * as a from '../controllers/agent.controller'
const r = Router()
r.get('/', a.agentGetAll)
r.post('/', a.agentCreate)
r.put('/:id', a.agentUpdate)
r.delete('/:id', a.agentDelete)
export default r
