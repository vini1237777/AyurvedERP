import { Router } from "express";
import * as inv from "../controllers/invoice.controller";

const r = Router();

r.get("/", inv.getAll);
r.get("/returns/all", inv.getAllReturns);
r.get("/returns/:id", inv.getReturnById);
r.get("/:id", inv.getById);
r.post("/", inv.create);
r.post("/:id/return", inv.createReturn);
r.put("/:id/cancel", inv.cancel);

export default r;
