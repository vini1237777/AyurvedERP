import { Router } from "express";
import * as report from "../controllers/report.controller";

const r = Router();

r.get("/sale-register", report.saleRegister);
r.get("/gst", report.gstReport);
r.get("/stock", report.stockReport);

export default r;
