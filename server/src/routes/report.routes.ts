import { Router } from "express";
import * as report from "../controllers/report.controller";

const r = Router();

r.get("/sale-register", report.saleRegister);
r.get("/gst", report.gstReport);
r.get("/gst-r1", report.getGstR1);
r.get("/gst-r3", report.getGstR3);
r.get("/stock", report.stockReport);
r.get("/ledger", report.getLedger);

export default r;
