-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "estimatedDM" REAL NOT NULL,
    "estimatedDL" REAL NOT NULL,
    "estimatedMOH" REAL NOT NULL,
    "quotePrice" REAL NOT NULL,
    "vatRate" REAL NOT NULL DEFAULT 7,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Quote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Quote" ("createdAt", "estimatedDL", "estimatedDM", "estimatedMOH", "id", "jobId", "quotePrice") SELECT "createdAt", "estimatedDL", "estimatedDM", "estimatedMOH", "id", "jobId", "quotePrice" FROM "Quote";
DROP TABLE "Quote";
ALTER TABLE "new_Quote" RENAME TO "Quote";
CREATE UNIQUE INDEX "Quote_jobId_key" ON "Quote"("jobId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
