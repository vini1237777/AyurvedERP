import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import customerRoutes from "./routes/customer.routes";
import itemRoutes from "./routes/item.routes";
import batchRoutes from "./routes/batch.routes";
import agentRoutes from "./routes/agent.routes";
import purchaseRoutes from "./routes/purchase.routes";
import invoiceRoutes from "./routes/invoice.routes";
import hsnRoutes from "./routes/hsn.routes";
import reportRoutes from "./routes/report.routes";
import categoryPriceRoutes from "./routes/categoryprice.routes";
import companyRoutes from "./routes/company.routes";

dotenv.config();

const app = express();

const corsMiddleware = cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Seed-Token"],
});

app.use(corsMiddleware);
app.options("*", corsMiddleware);
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    const prisma = (await import("./utils/prisma")).default;
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "connected" });
  } catch (err: any) {
    res.status(500).json({ ok: false, db: "error", message: err?.message });
  }
});

app.use("/api/customers", customerRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/hsn", hsnRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/category-prices", categoryPriceRoutes);
app.use("/api/company", companyRoutes);

app.get("/", (_req, res) => {
  res.json({ message: "ERP API running", version: "1.0.0" });
});

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err.stack);
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    res.status(500).json({ error: err.message || "Internal server error" });
  },
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
