/*
  Warnings:

  - Made the column `productType` on table `Job` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobCode" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "paperType" TEXT,
    "paperWeight" TEXT,
    "paperSize" TEXT,
    "printingLocation" TEXT,
    "hasCoating" BOOLEAN NOT NULL DEFAULT false,
    "coatingDone" BOOLEAN NOT NULL DEFAULT false,
    "hasDieCut" BOOLEAN NOT NULL DEFAULT false,
    "dieCutDone" BOOLEAN NOT NULL DEFAULT false,
    "hasGlue" BOOLEAN NOT NULL DEFAULT false,
    "glueDone" BOOLEAN NOT NULL DEFAULT false,
    "hasAssembly" BOOLEAN NOT NULL DEFAULT false,
    "assemblyDone" BOOLEAN NOT NULL DEFAULT false,
    "printDone" BOOLEAN NOT NULL DEFAULT false,
    "materialsReady" BOOLEAN NOT NULL DEFAULT false,
    "paperSupplier" TEXT,
    "materialsOrderedAt" DATETIME,
    "qcPassed" BOOLEAN,
    "qcNote" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'QUOTATION',
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "poNumber" TEXT,
    "poDate" DATETIME,
    "deliveryDueDate" DATETIME,
    "deliveryActualDate" DATETIME,
    "deliveryPartial" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Job_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Job" ("clientId", "closed", "createdAt", "createdById", "deliveryActualDate", "deliveryDueDate", "deliveryPartial", "description", "hasAssembly", "hasCoating", "hasDieCut", "hasGlue", "id", "jobCode", "jobName", "paperSize", "paperType", "paperWeight", "poDate", "poNumber", "printingLocation", "productType", "qcNote", "qcPassed", "quantity", "stage", "updatedAt") SELECT "clientId", "closed", "createdAt", "createdById", "deliveryActualDate", "deliveryDueDate", "deliveryPartial", "description", "hasAssembly", "hasCoating", "hasDieCut", "hasGlue", "id", "jobCode", "jobName", "paperSize", "paperType", "paperWeight", "poDate", "poNumber", "printingLocation", "productType", "qcNote", "qcPassed", "quantity", "stage", "updatedAt" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
CREATE UNIQUE INDEX "Job_jobCode_key" ON "Job"("jobCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
