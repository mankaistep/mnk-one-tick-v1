-- CreateTable
CREATE TABLE "OneTickOrderLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "webhookId" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "shopifyOrderCreatedAt" DATETIME NOT NULL,
    "shopifyOrderCustomerId" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "subtotalPrice" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "oneTickPrice" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL
);
