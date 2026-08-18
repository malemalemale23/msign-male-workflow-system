-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactInfo" TEXT,
    "taxId" TEXT,
    "address" TEXT,
    "creditTermDays" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobCode" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "productType" TEXT,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "paperType" TEXT,
    "paperWeight" TEXT,
    "paperSize" TEXT,
    "printingLocation" TEXT,
    "hasCoating" BOOLEAN NOT NULL DEFAULT false,
    "hasDieCut" BOOLEAN NOT NULL DEFAULT false,
    "hasGlue" BOOLEAN NOT NULL DEFAULT false,
    "hasAssembly" BOOLEAN NOT NULL DEFAULT false,
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

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "estimatedDM" REAL NOT NULL,
    "estimatedDL" REAL NOT NULL,
    "estimatedMOH" REAL NOT NULL,
    "quotePrice" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Quote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActualCost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "actualDM" REAL,
    "actualDL" REAL,
    "actualMOH" REAL,
    "actualProfit" REAL,
    "closedById" TEXT,
    "closedAt" DATETIME,
    CONSTRAINT "ActualCost_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ActualCost_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Billing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "amountDue" REAL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentDueDate" DATETIME,
    "paymentReceivedDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Billing_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Job_jobCode_key" ON "Job"("jobCode");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_jobId_key" ON "Quote"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "ActualCost_jobId_key" ON "ActualCost"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Billing_jobId_key" ON "Billing"("jobId");
