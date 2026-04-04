import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import customerRoutes from "./routes/customer.routes";
import itemRoutes from "./routes/item.routes";
import batchRoutes from "./routes/batch.routes";
import agentRoutes from "./routes/agent.routes";
import invoiceRoutes from "./routes/invoice.routes";
import hsnRoutes from "./routes/hsn.routes";
import reportRoutes from "./routes/report.routes";
import categoryPriceRoutes from "./routes/categoryprice.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/customers", customerRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/hsn", hsnRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/category-prices", categoryPriceRoutes);

app.get("/", (_req, res) => {
  res.json({ message: "Fulanand ERP API running", version: "1.0.0" });
});

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || "Internal server error" });
  },
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
