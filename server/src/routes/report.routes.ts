import { Router } from "express";
import * as report from "../controllers/report.controller";

const r = Router();

r.get("/sale-register", report.saleRegister);
r.get("/gst", report.gstReport);
r.get("/gst-r1", report.getGstR1);
r.get("/gst-r3", report.getGstR3);
r.get("/stock", report.stockReport);
r.get("/ledger", report.getLedger);
r.get("/trial-balance", report.getTrialBalance);
r.get("/profit-loss", report.getProfitLoss);
r.get("/journal", report.getJournal);
r.get("/dashboard-summary", report.getDashboardSummary);
r.get("/hsn-summary", report.getHsnSummary);

export default r;
