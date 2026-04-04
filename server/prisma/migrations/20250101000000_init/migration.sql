-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "mobile" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "stateCode" TEXT NOT NULL DEFAULT '27',
    "state" TEXT NOT NULL DEFAULT 'Maharashtra',
    "bank" TEXT,
    "ifsc" TEXT,
    "account" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "gstin" TEXT,
    "pan" TEXT,
    "dlNo" TEXT,
    "state" TEXT NOT NULL DEFAULT 'Maharashtra',
    "stateCode" TEXT NOT NULL DEFAULT '27',
    "address" TEXT,
    "city" TEXT,
    "pincode" TEXT,
    "mobile" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Agent" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaxSlab" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "TaxSlab_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HsnCode" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "gstRate" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "HsnCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "hsnId" INTEGER NOT NULL,
    "taxSlabId" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'Pcs',
    "altUnit" TEXT,
    "altFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "maintainBatch" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Batch" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "batchNo" TEXT NOT NULL,
    "expiryDate" TEXT,
    "mfgDate" TEXT,
    "purchasePrice" DOUBLE PRECISION,
    "salePrice" DOUBLE PRECISION,
    "mrp" DOUBLE PRECISION,
    "openingQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invoice" (
    "id" SERIAL NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "terms" TEXT NOT NULL DEFAULT 'Credit',
    "customerId" INTEGER NOT NULL,
    "agentId" INTEGER,
    "customerGstin" TEXT,
    "customerState" TEXT NOT NULL,
    "customerStateCode" TEXT NOT NULL,
    "taxType" TEXT NOT NULL DEFAULT 'CGST_SGST',
    "totalDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTaxable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cgstAmt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgstAmt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igstAmt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roundOff" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SAVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvoiceItem" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "batchId" INTEGER,
    "itemName" TEXT NOT NULL,
    "hsnCode" TEXT NOT NULL,
    "mrp" DOUBLE PRECISION,
    "rate" DOUBLE PRECISION NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "altQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freeQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "per" TEXT NOT NULL DEFAULT 'Pcs',
    "basicAmt" DOUBLE PRECISION NOT NULL,
    "discPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discAmt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxableAmt" DOUBLE PRECISION NOT NULL,
    "gstPercent" DOUBLE PRECISION NOT NULL,
    "taxAmt" DOUBLE PRECISION NOT NULL,
    "returnedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netValue" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesReturn" (
    "id" SERIAL NOT NULL,
    "returnNo" INTEGER NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "reason" TEXT,
    "totalTaxable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCredit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesReturn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesReturnItem" (
    "id" SERIAL NOT NULL,
    "salesReturnId" INTEGER NOT NULL,
    "invoiceItemId" INTEGER NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "discPercent" DOUBLE PRECISION NOT NULL,
    "gstPercent" DOUBLE PRECISION NOT NULL,
    "taxableAmt" DOUBLE PRECISION NOT NULL,
    "taxAmt" DOUBLE PRECISION NOT NULL,
    "netValue" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "SalesReturnItem_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "HsnCode_code_key" ON "HsnCode"("code");
CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");
CREATE UNIQUE INDEX "SalesReturn_returnNo_key" ON "SalesReturn"("returnNo");

-- Foreign keys
ALTER TABLE "Item" ADD CONSTRAINT "Item_hsnId_fkey" FOREIGN KEY ("hsnId") REFERENCES "HsnCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Item" ADD CONSTRAINT "Item_taxSlabId_fkey" FOREIGN KEY ("taxSlabId") REFERENCES "TaxSlab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturnItem" ADD CONSTRAINT "SalesReturnItem_salesReturnId_fkey" FOREIGN KEY ("salesReturnId") REFERENCES "SalesReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesReturnItem" ADD CONSTRAINT "SalesReturnItem_invoiceItemId_fkey" FOREIGN KEY ("invoiceItemId") REFERENCES "InvoiceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
