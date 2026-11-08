-- CreateIndex
CREATE INDEX "Invoice_customerId_invoiceDate_idx" ON "Invoice"("customerId", "invoiceDate");

-- CreateIndex
CREATE INDEX "Invoice_invoiceDate_idx" ON "Invoice"("invoiceDate");

-- CreateIndex
CREATE INDEX "Invoice_financialYear_invoiceDate_idx" ON "Invoice"("financialYear", "invoiceDate");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceItem_batchId_idx" ON "InvoiceItem"("batchId");

-- CreateIndex
CREATE INDEX "Purchase_financialYear_purchaseDate_idx" ON "Purchase"("financialYear", "purchaseDate");

-- CreateIndex
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");
