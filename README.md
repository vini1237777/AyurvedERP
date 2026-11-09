# Aushadhi ERP

Aushadhi ERP is a GST billing and inventory management system for medicine and
wellness distribution workflows. It brings sales, purchases, returns, batch
stock, GST reporting, category pricing, and company masters into one full-stack
ERP built with React, Express, PostgreSQL, and Prisma.

> **Demo data:** The deployed preview uses seeded mock business records to
> demonstrate ERP workflows, GST reports, and inventory behavior. It does not
> contain real client or business data.

## Architecture

```mermaid
flowchart LR
  subgraph Client["React + TypeScript client"]
    UI["Billing, purchases, masters and reports"]
  end

  subgraph API["Express API, one process or a Node cluster"]
    Auth["JWT auth and role checks"]
    Controllers["Business controllers"]
    Tax["GST calculation"]
    Stock["Batch stock updates"]
    Ledger["Double entry posting"]
    Reports["Report aggregation"]
  end

  subgraph Data["Data layer"]
    Prisma["Prisma ORM"]
    Postgres[("PostgreSQL")]
    Redis[("Redis cache")]
  end

  UI -->|"REST + bearer token"| Auth
  Auth --> Controllers
  Controllers --> Tax
  Controllers --> Stock
  Controllers --> Ledger
  Controllers --> Reports
  Stock --> Prisma
  Ledger --> Prisma
  Reports --> Prisma
  Prisma --> Postgres
  Controllers -.->|"Item, customer and dashboard reads, falls back to Postgres"| Redis
```

## Features

- Supports sales invoices, purchase entries, sale returns, cancellation flows,
  and financial-year document tracking.
- Updates batch-level inventory during invoice creation, purchase entry,
  cancellation, and return workflows.
- Calculates taxable values, discounts, CGST, SGST, and IGST using HSN-linked tax
  data and customer or supplier state codes.
- Provides operational reports for Sale Register, GST Summary, GSTR-1, GSTR-3B,
  Stock Report, Party Ledger, Item Category, and Customer Category.
- Uses a 16-model relational Prisma schema for customers, agents, items, HSN
  codes, tax slabs, batches, invoices, purchases, returns, category pricing,
  and company profile data.
- Ships with demo-ready seeded records so reviewers can inspect billing,
  reporting, and inventory flows without real business data.

## Core Modules

| Module | Scope |
| --- | --- |
| Dashboard | Sales totals, invoice counts, recent invoices, and recent returns |
| Sales | GST invoices, invoice printing, stock deduction, cancellation, and sale returns |
| Purchases | Purchase entries, purchase vouchers, GRN printing, stock increments, and cancellation |
| Masters | Customers, items, HSN data, tax slabs, batches, agents, and company profile |
| Reports | Sale Register, GST Summary, GSTR-1, GSTR-3B, Stock Report, Party Ledger, item-category, and customer-category reports |
| Pricing | Item category price setup and category-wise reporting |

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Cache | Redis, optional |

## Data Model

The Prisma schema currently models:

- Company profile, customers, agents, items, batches, HSN codes, and tax slabs.
- Sales invoices with invoice items and sales returns with return items.
- Purchases with purchase items and purchase returns with return items.
- Item category pricing for customer-category rate workflows.

## Database Performance

Each index below serves a query the app really runs. Two other candidates were
tested and dropped: `Batch(itemId, createdAt)` saved about 0.2 ms, and nothing
in the app filters purchases by supplier.

| Index | Query it serves | Before | After |
| --- | --- | --- | --- |
| `Invoice(customerId, invoiceDate)` | Invoice list for one customer, page 1 | 27.89 ms | 0.15 ms |
| | Party ledger, one customer, one year | 18.24 ms | 0.06 ms |
| `Invoice(invoiceDate)` | Invoice list, newest first, page 1 | 28.35 ms | 0.04 ms |
| | Sale register, one month | 30.67 ms | 2.37 ms |
| `Invoice(financialYear, invoiceDate)` | Invoice list, oldest year, page 1 | 25.16 ms | 0.09 ms |
| | GST summary, one year and month | 19.37 ms | 1.83 ms |
| `InvoiceItem(invoiceId)` | Lines of one invoice | 47.54 ms | 0.01 ms |
| `InvoiceItem(batchId)` | Check an unsold batch before deleting it | 49.38 ms | under 0.01 ms |
| `Purchase(financialYear, purchaseDate)` | Purchase list, oldest year, page 1 | 2.72 ms | 0.03 ms |
| `PurchaseItem(purchaseId)` | Lines of one purchase | 5.85 ms | 0.01 ms |

These indexes have a cost and some limits:

- Inserting 1,000 invoices with 4 lines each went from about 92 ms to 106 ms.
- Index storage on these tables went from 29 MB to 52 MB.
- The whole-year GST summary reads about a third of the table, so it improves
  far less (28 ms to 15 ms). The HSN summary improves, but its timing varies a
  lot between runs (70 to 97 ms before, 10 to 61 ms after).

Measured with `EXPLAIN ANALYZE` on a laptop against synthetic data: 100,000
invoices, 400,000 invoice lines, 20,000 purchases and 80,000 purchase lines.
Times are the median of 5 benchmark runs, each taking the median of 9
executions. Treat them as a before and after comparison, not production numbers.

To reproduce, see [`server/src/scripts/db-benchmark.ts`](server/src/scripts/db-benchmark.ts).

## API Surface

| Base Route | Responsibility |
| --- | --- |
| `/api/customers` | Customer master and search |
| `/api/items` | Item master, item search, and item batches |
| `/api/batches` | Batch master and stock quantities |
| `/api/agents` | Agent master |
| `/api/hsn` | HSN codes and tax slabs |
| `/api/invoices` | Sales invoices, returns, cancellation, and next invoice number |
| `/api/purchases` | Purchases, returns, cancellation, and next purchase number |
| `/api/reports` | Sale Register, GST, GSTR-1, GSTR-3B, stock, and ledger reports |
| `/api/category-prices` | Item category pricing and category reports |
| `/api/company` | Company profile |

## GST Calculation

```text
Basic Amount = Rate x Quantity
Discount     = Basic Amount x Discount %
Taxable      = Basic Amount - Discount
Tax          = Taxable x GST %
Net Value    = Taxable + Tax

Intra-state supply: CGST + SGST
Inter-state supply: IGST
```

## Benchmarks & Architecture Verification

Each row links to the code and to what checks it.

| Claim | Code | Evidence |
|---|---|---|
| k6 throughput with Redis and cluster | [05-throughput-compare.js](server/load-tests/05-throughput-compare.js), [run-compare.sh](server/load-tests/run-compare.sh) | [results and raw k6 output](server/load-tests/results/results.md) |
| Node cluster workers | [cluster.ts](server/src/cluster.ts) | 4 worker row in the results above |
| Redis caching | [cache.ts](server/src/utils/cache.ts) | [cache validation script](server/load-tests/03-cache-validation.js) |
| Prisma ACID transactions | [invoice.controller.ts](server/src/controllers/invoice.controller.ts), [purchase.controller.ts](server/src/controllers/purchase.controller.ts) | [last strip race script](server/load-tests/04-last-strip-race.js) |
| JWT and role checks | [secrets.ts](server/src/utils/secrets.ts) | [85 route guard tests](server/test/rbac.test.ts) |
| TanStack Query list caching | [queryClient.ts](client/src/utils/queryClient.ts) | [Playwright list cache spec](client/e2e/list-cache.spec.ts) |
| Docker stack | [server/Dockerfile](server/Dockerfile), [client/Dockerfile](client/Dockerfile), [docker-compose.yml](docker-compose.yml) | Image sizes are not listed until they are measured |

The load tests read from a small local dataset on a laptop, so they compare setups and do not predict production numbers.

## Local Setup

### 1. Clone and install

```bash
cd server
npm install

cd ../client
npm install
```

### 2. Configure the backend

Create `server/.env` and set the PostgreSQL connection string:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

### 3. Run Prisma migrations

```bash
cd server
npx prisma migrate deploy
npx prisma generate
```

For a new local development database, `npx prisma migrate dev` can be used
instead of `migrate deploy`.

### 4. Seed sample data when needed

```bash
cd server
npm run prisma:seed
```

### 5. Start the apps

Backend:

```bash
cd server
npm run dev
```

Frontend:

```bash
cd client
npm run dev
```

Point the frontend at the backend with `client/.env` when the API is not using
the fallback URL:

```env
VITE_API_URL=http://localhost:5000/api
```

The server uses `PORT` from `server/.env` when it is defined.

## Project Structure

```text
.
|-- client/
|   |-- public/                 # Invoice and purchase print templates
|   `-- src/
|       |-- components/         # Layout and reusable UI
|       |-- pages/              # Dashboard, masters, sales, reports, settings
|       |-- types/              # Shared frontend types
|       `-- utils/              # API clients and invoice utilities
`-- server/
    |-- prisma/                 # Schema, migrations, and seed data
    `-- src/
        |-- controllers/        # Sales, purchase, report, and master logic
        |-- routes/             # Express route modules
        `-- utils/              # Prisma client setup
```

## Portfolio Summary

Aushadhi ERP demonstrates full-stack handling of tax-aware invoicing,
transaction-driven inventory movement, relational data modeling, and reporting
for an operational business workflow.
