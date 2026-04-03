# Fulanand ERP — Setup Guide

## Tech Stack

- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + Express + TypeScript + Prisma
- Database: PostgreSQL

---

## Quick Start

### Step 1 — Database setup

```bash
# Make sure PostgreSQL is running
brew services start postgresql@14   # Mac (Homebrew)

# Create database
psql postgres
CREATE DATABASE fulanand_erp;
\q
```

### Step 2 — Backend

```bash
cd server
npm install

# Create .env file
cp .env.example .env
# Edit .env — replace YOUR_MAC_USERNAME with your actual username (run: whoami)

# Run migrations
npx prisma migrate dev --name init
npx prisma generate

# Seed sample data
npm run prisma:seed

# Start server
npm run dev
# → http://localhost:5000
```

### Step 3 — Frontend

```bash
cd client
npm install
npm run dev
# → http://localhost:5173
```

---

## Module Order (Data Entry First)

```
1. Masters (Data Entry Module)
   /masters/customers  → Add customers
   /masters/items      → Add items with HSN
   /masters/batches    → Add stock batches

2. Sales
   /sales/new         → Create invoice
   /sales             → All invoices

3. Reports (coming next)
```

---

## API Endpoints

| Method | URL                      | Description                   |
| ------ | ------------------------ | ----------------------------- |
| GET    | /api/customers           | List customers                |
| POST   | /api/customers           | Create customer               |
| GET    | /api/customers/search?q= | Search                        |
| GET    | /api/items               | List items                    |
| POST   | /api/items               | Create item                   |
| GET    | /api/batches             | List batches                  |
| POST   | /api/batches             | Create batch                  |
| GET    | /api/agents              | List agents                   |
| POST   | /api/agents              | Create agent                  |
| GET    | /api/hsn                 | List HSN codes                |
| GET    | /api/invoices            | List invoices                 |
| POST   | /api/invoices            | Create invoice + deduct stock |
| PUT    | /api/invoices/:id/cancel | Cancel + reverse stock        |

---

## Project Structure

```
fulanand-erp/
├── server/
│   ├── prisma/
│   │   ├── schema.prisma       ← DB schema
│   │   └── seed.ts             ← Sample data
│   ├── src/
│   │   ├── app.ts              ← Express server
│   │   ├── controllers/        ← Business logic
│   │   ├── routes/             ← API routes
│   │   └── utils/prisma.ts     ← DB client
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
└── client/
    ├── src/
    │   ├── components/
    │   │   ├── ui/             ← Reusable components
    │   │   └── layout/         ← App layout + sidebar
    │   ├── pages/
    │   │   ├── Dashboard.tsx
    │   │   ├── masters/        ← Customers, Items, Batches
    │   │   └── sales/          ← SaleEntry, SaleList
    │   ├── utils/
    │   │   ├── api.ts          ← All API calls
    │   │   └── invoice.utils.ts← GST calc, formatters
    │   ├── types/index.ts      ← All TypeScript types
    │   └── App.tsx             ← Routes
    ├── package.json
    └── vite.config.ts
```

---

## GST Calculation Logic

```
Basic Amt  = Rate × Qty
Disc Amt   = Basic × Disc%
Taxable    = Basic - Disc Amt
Tax        = Taxable × GST%
Net Value  = Taxable + Tax

CGST = Tax/2  (intra-state: seller state == buyer state)
SGST = Tax/2
IGST = Tax    (inter-state)
```

---

## Print — Half A4

- 1 copies per A4 sheet
- Checkboxes: Original / Duplicate / Triplicate / Delivery Challan
- Cut line between copies
