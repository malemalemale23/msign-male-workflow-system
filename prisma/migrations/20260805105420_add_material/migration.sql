-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameTh" TEXT,
    "category" TEXT,
    "supplier" TEXT,
    "unit" TEXT,
    "unitPrice" REAL,
    "quantityOnHand" REAL NOT NULL DEFAULT 0,
    "reorderThreshold" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
