import express from "express";
import cors from "cors";
import compression from "compression";
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
import authRoutes from "./routes/auth.routes";
import { requireAuth, readOnlyForRoles } from "./middleware/auth";
import { requestId } from "./middleware/requestId";
import { HttpError, sendError } from "./utils/httpError";

dotenv.config();

const app = express();

const corsMiddleware = cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Seed-Token"],
  // The client and API are on different origins, so browsers ask permission
  // before each request. Remember the answer instead (Chrome caps this at 2h).
  maxAge: 7200,
});

app.use(requestId);
app.use(corsMiddleware);
app.options("*", corsMiddleware);
app.use(compression({ level: 3 }));
app.use(express.json());

import prisma from "./utils/prisma";
import visitRoutes from "./routes/visit.routes";

app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "connected" });
  } catch (err) {
    console.error(`[${req.id}] health check`, err);
    res.status(500).json({ ok: false, db: "error" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/visits", visitRoutes);
// Sales-facing: SELLER + ADMIN write; ACCOUNTANT + RETAILER read-only
app.use(
  "/api/customers",
  requireAuth,
  readOnlyForRoles("ACCOUNTANT", "RETAILER"),
  customerRoutes,
);
app.use(
  "/api/invoices",
  requireAuth,
  readOnlyForRoles("ACCOUNTANT", "RETAILER"),
  invoiceRoutes,
);
// Masters: ADMIN-only writes (everyone else read)
app.use(
  "/api/items",
  requireAuth,
  readOnlyForRoles("SELLER", "ACCOUNTANT", "RETAILER"),
  itemRoutes,
);
app.use(
  "/api/batches",
  requireAuth,
  readOnlyForRoles("SELLER", "ACCOUNTANT", "RETAILER"),
  batchRoutes,
);
app.use(
  "/api/agents",
  requireAuth,
  readOnlyForRoles("SELLER", "ACCOUNTANT", "RETAILER"),
  agentRoutes,
);
app.use(
  "/api/hsn",
  requireAuth,
  readOnlyForRoles("SELLER", "ACCOUNTANT", "RETAILER"),
  hsnRoutes,
);
app.use(
  "/api/category-prices",
  requireAuth,
  readOnlyForRoles("SELLER", "ACCOUNTANT", "RETAILER"),
  categoryPriceRoutes,
);
app.use(
  "/api/company",
  requireAuth,
  readOnlyForRoles("SELLER", "ACCOUNTANT", "RETAILER"),
  companyRoutes,
);
// Purchases: ADMIN-only writes
app.use(
  "/api/purchases",
  requireAuth,
  readOnlyForRoles("SELLER", "ACCOUNTANT", "RETAILER"),
  purchaseRoutes,
);
// Reports: read for everyone authenticated
app.use("/api/reports", requireAuth, reportRoutes);

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
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    // A body that isn't valid JSON is the client's mistake, not a server error.
    const status = (err as { status?: number }).status;
    if (status && status >= 400 && status < 500)
      return sendError(req, res, new HttpError(status, "The request could not be read."));
    sendError(req, res, err);
  },
);

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
