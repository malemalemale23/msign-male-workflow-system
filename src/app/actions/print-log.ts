"use server";

import { requirePermission } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import type { PrintDocumentType } from "@/generated/prisma/client";

// Called when the Print button is clicked on a document view - viewing the
// page itself is the preview, this is the "print" half of that split. Same
// permission gate every print view already uses (jobs.view_price).
export async function logPrint(jobId: string, documentType: PrintDocumentType) {
  const session = await requirePermission("jobs.view_price");
  await prisma.printLog.create({
    data: { jobId, documentType, printedById: session.userId },
  });
}
