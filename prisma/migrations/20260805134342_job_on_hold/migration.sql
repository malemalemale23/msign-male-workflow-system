-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobCode" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "shortName" TEXT,
    "productType" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "paperType" TEXT,
    "paperWeight" TEXT,
    "paperSize" TEXT,
    "printingLocation" TEXT,
    "hasDesign" BOOLEAN NOT NULL DEFAULT false,
    "designDone" BOOLEAN NOT NULL DEFAULT false,
    "hasMock" BOOLEAN NOT NULL DEFAULT false,
    "mockDone" BOOLEAN NOT NULL DEFAULT false,
    "hasPlate" BOOLEAN NOT NULL DEFAULT false,
    "plateDone" BOOLEAN NOT NULL DEFAULT false,
    "printDone" BOOLEAN NOT NULL DEFAULT false,
    "hasEmboss" BOOLEAN NOT NULL DEFAULT false,
    "embossDone" BOOLEAN NOT NULL DEFAULT false,
    "hasVarnish" BOOLEAN NOT NULL DEFAULT false,
    "varnishDone" BOOLEAN NOT NULL DEFAULT false,
    "hasGlue" BOOLEAN NOT NULL DEFAULT false,
    "glueDone" BOOLEAN NOT NULL DEFAULT false,
    "hasDieCut" BOOLEAN NOT NULL DEFAULT false,
    "dieCutDone" BOOLEAN NOT NULL DEFAULT false,
    "hasHotStamp" BOOLEAN NOT NULL DEFAULT false,
    "hotStampDone" BOOLEAN NOT NULL DEFAULT false,
    "hasKCoating" BOOLEAN NOT NULL DEFAULT false,
    "kCoatingDone" BOOLEAN NOT NULL DEFAULT false,
    "hasFolding" BOOLEAN NOT NULL DEFAULT false,
    "foldingDone" BOOLEAN NOT NULL DEFAULT false,
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
    "onHold" BOOLEAN NOT NULL DEFAULT false,
    "holdReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Job_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Job" ("clientId", "closed", "createdAt", "createdById", "deliveryActualDate", "deliveryDueDate", "description", "designDone", "dieCutDone", "embossDone", "foldingDone", "glueDone", "hasDesign", "hasDieCut", "hasEmboss", "hasFolding", "hasGlue", "hasHotStamp", "hasKCoating", "hasMock", "hasPlate", "hasVarnish", "hotStampDone", "id", "jobCode", "jobName", "kCoatingDone", "materialsOrderedAt", "materialsReady", "mockDone", "paperSize", "paperSupplier", "paperType", "paperWeight", "plateDone", "poDate", "poNumber", "printDone", "printingLocation", "productType", "qcNote", "qcPassed", "quantity", "shortName", "stage", "updatedAt", "varnishDone") SELECT "clientId", "closed", "createdAt", "createdById", "deliveryActualDate", "deliveryDueDate", "description", "designDone", "dieCutDone", "embossDone", "foldingDone", "glueDone", "hasDesign", "hasDieCut", "hasEmboss", "hasFolding", "hasGlue", "hasHotStamp", "hasKCoating", "hasMock", "hasPlate", "hasVarnish", "hotStampDone", "id", "jobCode", "jobName", "kCoatingDone", "materialsOrderedAt", "materialsReady", "mockDone", "paperSize", "paperSupplier", "paperType", "paperWeight", "plateDone", "poDate", "poNumber", "printDone", "printingLocation", "productType", "qcNote", "qcPassed", "quantity", "shortName", "stage", "updatedAt", "varnishDone" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
CREATE UNIQUE INDEX "Job_jobCode_key" ON "Job"("jobCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
