"use client";

import { logPrint } from "@/app/actions/print-log";
import type { PrintDocumentType } from "@/generated/prisma/client";

export function PrintButton({
  label,
  jobId,
  documentType,
}: {
  label: string;
  jobId: string;
  documentType: PrintDocumentType;
}) {
  const handleClick = async () => {
    // Fire-and-forget: don't let a slow/failed log write hold up the
    // print dialog opening, this is a best-effort record, not a gate.
    logPrint(jobId, documentType).catch(() => {});
    window.print();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="print:hidden rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
    >
      {label}
    </button>
  );
}
