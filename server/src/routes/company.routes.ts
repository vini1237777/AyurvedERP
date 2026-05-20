import { Router } from 'express'
import * as c from '../controllers/company.controller'
const r = Router()
r.get('/', c.companyGet)
r.put('/', c.companySave)
export default r
