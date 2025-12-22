/*
  Warnings:

  - Added the required column `shopId` to the `ShopSettings` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" INTEGER NOT NULL,
    "alertId" INTEGER,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NotificationLog_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "NotificationLog_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "LowStockAlert" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
-- Ensure a Store row exists for every existing ShopSettings.shop
INSERT INTO "Store" ("shop", "createdAt", "updatedAt")
SELECT s."shop", COALESCE(s."createdAt", CURRENT_TIMESTAMP), COALESCE(s."updatedAt", CURRENT_TIMESTAMP)
FROM "ShopSettings" s
WHERE NOT EXISTS (
  SELECT 1 FROM "Store" st WHERE st."shop" = s."shop"
);

CREATE TABLE "new_ShopSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "shopId" INTEGER NOT NULL,
    "globalThreshold" INTEGER NOT NULL DEFAULT 5,
    "alertEmails" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShopSettings_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ShopSettings" ("id", "shop", "shopId", "globalThreshold", "alertEmails", "createdAt", "updatedAt")
SELECT s."id", s."shop", st."id", s."globalThreshold", s."alertEmails", s."createdAt", s."updatedAt"
FROM "ShopSettings" s
JOIN "Store" st ON st."shop" = s."shop";
DROP TABLE "ShopSettings";
ALTER TABLE "new_ShopSettings" RENAME TO "ShopSettings";
CREATE UNIQUE INDEX "ShopSettings_shop_key" ON "ShopSettings"("shop");
CREATE UNIQUE INDEX "ShopSettings_shopId_key" ON "ShopSettings"("shopId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "NotificationLog_shopId_idx" ON "NotificationLog"("shopId");

-- CreateIndex
CREATE INDEX "NotificationLog_alertId_idx" ON "NotificationLog"("alertId");
