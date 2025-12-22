-- CreateTable
CREATE TABLE "LowStockAlert" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" INTEGER NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "variantId" TEXT,
    "productId" TEXT,
    "available" INTEGER NOT NULL,
    "threshold" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME,
    CONSTRAINT "LowStockAlert_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LowStockAlert_shopId_status_idx" ON "LowStockAlert"("shopId", "status");

-- CreateIndex
CREATE INDEX "LowStockAlert_shopId_inventoryItemId_idx" ON "LowStockAlert"("shopId", "inventoryItemId");
