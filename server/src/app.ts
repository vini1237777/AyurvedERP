import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
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
import { requireAuth, readOnlyForRoles, allowRoles } from "./middleware/auth";
import { requestId } from "./middleware/requestId";
import { HttpError, sendError } from "./utils/httpError";
import { options as customerOptions } from "./controllers/customer.controller";

dotenv.config();

const app = express();

// On Vercel one proxy sits in front of the API. Trusting exactly that hop makes
// req.ip the address the proxy saw, which a client can't forge by sending its
// own X-Forwarded-For. Without a proxy nothing is trusted. TRUST_PROXY sets the
// number of hops for other setups.
app.set(
  "trust proxy",
  Number(process.env.TRUST_PROXY ?? (process.env.VERCEL ? 1 : 0)),
);

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
app.disable("x-powered-by");
// The API only returns JSON, so helmet's defaults fit: they forbid framing,
// sniffing and inline content, and hide the server stack.
app.use(helmet());
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
// Each resource first limits which roles may use it at all (matching the menu
// in client/src/components/layout/AppLayout.tsx), then which of them may write.
// ADMIN passes both.

// Customer names for filters on pages every role can open, such as Sale Register.
app.get("/api/customers/options", requireAuth, customerOptions);
// Customers: SELLER writes; ACCOUNTANT reads
app.use(
  "/api/customers",
  requireAuth,
  allowRoles("SELLER", "ACCOUNTANT"),
  readOnlyForRoles("ACCOUNTANT", "RETAILER"),
  customerRoutes,
);
// Invoices: everyone reads; SELLER writes
app.use(
  "/api/invoices",
  requireAuth,
  readOnlyForRoles("ACCOUNTANT", "RETAILER"),
  invoiceRoutes,
);
// Items and HSN codes: SELLER and ACCOUNTANT read
app.use(
  "/api/items",
  requireAuth,
  allowRoles("SELLER", "ACCOUNTANT"),
  readOnlyForRoles("SELLER", "ACCOUNTANT", "RETAILER"),
  itemRoutes,
);
// Batches: ACCOUNTANT reads
app.use(
  "/api/batches",
  requireAuth,
  allowRoles("ACCOUNTANT"),
  readOnlyForRoles("SELLER", "ACCOUNTANT", "RETAILER"),
  batchRoutes,
);
// Agents: SELLER reads, for the sale screen
app.use(
  "/api/agents",
  requireAuth,
  allowRoles("SELLER"),
  readOnlyForRoles("SELLER", "ACCOUNTANT", "RETAILER"),
  agentRoutes,
);
app.use(
  "/api/hsn",
  requireAuth,
  allowRoles("SELLER", "ACCOUNTANT"),
  readOnlyForRoles("SELLER", "ACCOUNTANT", "RETAILER"),
  hsnRoutes,
);
// Category prices and the company profile: everyone reads
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
// Purchases: ACCOUNTANT reads
app.use(
  "/api/purchases",
  requireAuth,
  allowRoles("ACCOUNTANT"),
  readOnlyForRoles("SELLER", "ACCOUNTANT", "RETAILER"),
  purchaseRoutes,
);
// Reports: everyone reads, except the accounts below, for ACCOUNTANT only
app.use(
  [
    "/api/reports/ledger",
    "/api/reports/trial-balance",
    "/api/reports/profit-loss",
    "/api/reports/journal",
  ],
  requireAuth,
  allowRoles("ACCOUNTANT"),
);
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
