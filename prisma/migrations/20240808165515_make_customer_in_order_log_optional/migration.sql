-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OneTickOrderLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "webhookId" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "shopifyOrderCreatedAt" DATETIME NOT NULL,
    "shopifyOrderCustomerId" TEXT,
    "customerEmail" TEXT,
    "subtotalPrice" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "oneTickPrice" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL
);
INSERT INTO "new_OneTickOrderLog" ("createdAt", "customerEmail", "id", "oneTickPrice", "shopifyOrderCreatedAt", "shopifyOrderCustomerId", "shopifyOrderId", "subtotalPrice", "totalPrice", "updatedAt", "webhookId") SELECT "createdAt", "customerEmail", "id", "oneTickPrice", "shopifyOrderCreatedAt", "shopifyOrderCustomerId", "shopifyOrderId", "subtotalPrice", "totalPrice", "updatedAt", "webhookId" FROM "OneTickOrderLog";
DROP TABLE "OneTickOrderLog";
ALTER TABLE "new_OneTickOrderLog" RENAME TO "OneTickOrderLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
