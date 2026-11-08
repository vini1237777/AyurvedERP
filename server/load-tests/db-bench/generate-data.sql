-- Synthetic data for measuring query plans. Run this only on an empty database
-- created for benchmarking, after `prisma migrate deploy`.
\set ON_ERROR_STOP on
SELECT setseed(0.42);

INSERT INTO "TaxSlab" (id, name, rate) VALUES (1, 'GST 12', 12);

INSERT INTO "HsnCode" (id, code, description, "gstRate")
VALUES (1, '30049011', 'Ayurvedic medicine', 12);

INSERT INTO "Customer" (name, "updatedAt")
SELECT 'Customer ' || g, now() FROM generate_series(1, 2000) g;

INSERT INTO "Item" (name, "hsnId", "taxSlabId", "updatedAt")
SELECT 'Item ' || g, 1, 1, now() FROM generate_series(1, 500) g;

INSERT INTO "Batch" ("itemId", "batchNo", "expiryDate", "currentQty", "updatedAt")
SELECT 1 + (g % 500), 'B' || g, '2028-01-01', 100, now()
FROM generate_series(1, 3000) g;

-- 100,000 invoices over three financial years
INSERT INTO "Invoice" (
  "invoiceNo", "financialYear", "invoiceDate", "customerId", "customerState",
  "customerStateCode", "totalTaxable", "totalTax", "grandTotal", status, "updatedAt"
)
SELECT
  'B-' || g,
  CASE WHEN d >= '2026-04-01' THEN '2026-27'
       WHEN d >= '2025-04-01' THEN '2025-26'
       ELSE '2024-25' END,
  d,
  1 + floor(random() * 2000)::int,
  'Maharashtra', '27', 1000, 120, 1120,
  CASE WHEN random() < 0.03 THEN 'CANCELLED' ELSE 'SAVED' END,
  now()
FROM (
  SELECT g, timestamp '2024-04-01' + random() * interval '1095 days' AS d
  FROM generate_series(1, 100000) g
) s;

-- 400,000 invoice lines
INSERT INTO "InvoiceItem" (
  "invoiceId", "itemId", "batchId", "itemName", "hsnCode", rate, qty,
  "basicAmt", "taxableAmt", "gstPercent", "taxAmt", "netValue"
)
SELECT i, 1 + (b % 500), b, 'Item', '30049011', 250, 1, 250, 250, 12, 30, 280
FROM (
  SELECT 1 + (g % 100000) AS i, 1 + floor(random() * 3000)::int AS b
  FROM generate_series(1, 400000) g
) s;

-- 20,000 purchases and 80,000 purchase lines
INSERT INTO "Purchase" (
  "purchaseNo", "financialYear", "purchaseDate", "supplierId", "supplierState",
  "supplierStateCode", "grandTotal", "updatedAt"
)
SELECT
  'P-' || g,
  CASE WHEN d >= '2026-04-01' THEN '2026-27'
       WHEN d >= '2025-04-01' THEN '2025-26'
       ELSE '2024-25' END,
  d,
  1 + floor(random() * 200)::int,
  'Maharashtra', '27', 5000, now()
FROM (
  SELECT g, timestamp '2024-04-01' + random() * interval '1095 days' AS d
  FROM generate_series(1, 20000) g
) s;

INSERT INTO "PurchaseItem" (
  "purchaseId", "itemId", "batchId", "itemName", "hsnCode", rate, qty,
  "basicAmt", "taxableAmt", "gstPercent", "taxAmt", "netValue"
)
SELECT 1 + (g % 20000), 1 + (b % 500), b, 'Item', '30049011', 200, 5, 1000, 1000, 12, 120, 1120
FROM (
  SELECT g, 1 + floor(random() * 3000)::int AS b FROM generate_series(1, 80000) g
) s;

ANALYZE;
