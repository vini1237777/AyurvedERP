import { Router } from "express";
import {
  getByItem,
  upsertPrices,
  customerReport,
  itemReport,
  updateCustomerCategory,
} from "../controllers/categoryprice.controller";

const r = Router();
r.get("/customer-report", customerReport);
r.get("/item-report", itemReport);
r.get("/item/:itemId", getByItem);
r.post("/item/:itemId", upsertPrices);
r.patch("/customer/:id/category", updateCustomerCategory);

export default r;
