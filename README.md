# Aushadhi ERP

Aushadhi ERP is a GST billing and inventory management system for medicine and
wellness distribution workflows. It brings sales, purchases, returns, batch
stock, GST reporting, category pricing, and company masters into one full-stack
ERP built with React, Express, PostgreSQL, and Prisma.

> **Demo data:** The deployed preview uses seeded mock business records to
> demonstrate ERP workflows, GST reports, and inventory behavior. It does not
> contain real client or business data.

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

## Architecture

```mermaid
flowchart LR
  subgraph Browser["React + TypeScript Client"]
    Dashboard["Dashboard"]
    Sales["Sales and Returns"]
    Purchases["Purchases"]
    Masters["Masters and Pricing"]
    Reports["GST, Stock, Ledger Reports"]
    Print["Invoice and Purchase Print Views"]
  end

  subgraph API["Node.js + Express API"]
    Routes["REST Routes"]
    Controllers["Business Controllers"]
    Tax["GST and Amount Calculation"]
    Stock["Batch Stock Updates"]
    ReportLogic["Report Aggregation"]
  end

  subgraph Data["Data Layer"]
    Prisma["Prisma ORM"]
    Postgres["PostgreSQL"]
  end

  Dashboard --> Routes
  Sales --> Routes
  Purchases --> Routes
  Masters --> Routes
  Reports --> Routes
  Sales --> Print
  Purchases --> Print
  Routes --> Controllers
  Controllers --> Tax
  Controllers --> Stock
  Controllers --> ReportLogic
  Controllers --> Prisma
  Tax --> Prisma
  Stock --> Prisma
  ReportLogic --> Prisma
  Prisma --> Postgres
```

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

## Data Model

The Prisma schema currently models:

- Company profile, customers, agents, items, batches, HSN codes, and tax slabs.
- Sales invoices with invoice items and sales returns with return items.
- Purchases with purchase items and purchase returns with return items.
- Item category pricing for customer-category rate workflows.

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
