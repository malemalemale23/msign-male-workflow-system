"use client";

import Link from "next/link";
import { translate, type Locale, type TKey } from "@/lib/i18n";
import { PrintButton } from "@/components/PrintButton";
import type { PrintDocumentType } from "@/generated/prisma/client";

export type PrintSectionKey = "letterhead" | "notes" | "signatures";

export const DEFAULT_PRINT_SECTIONS: Record<PrintSectionKey, boolean> = {
  letterhead: true,
  notes: true,
  signatures: true,
};

const SECTION_LABEL_KEY: Record<PrintSectionKey, TKey> = {
  letterhead: "printOptionLetterhead",
  notes: "printOptionNotes",
  signatures: "printOptionSignatures",
};

const ALL_SECTIONS = Object.keys(SECTION_LABEL_KEY) as PrintSectionKey[];

// Shared "Show on printout" toggle panel + Print button, used by every
// printable document view (Quotation, Sale Order, ...) so the controls stay
// consistent and only need translating in one place.
export function PrintControls({
  locale,
  jobId,
  documentType,
  visible,
  onChange,
  // Which toggles this document actually has content for. Defaults to all
  // three; pass a narrower list for documents missing a section (e.g. the
  // Billing Statement has no notes block) so the panel never shows a
  // checkbox that does nothing when toggled.
  sections = ALL_SECTIONS,
}: {
  locale: Locale;
  jobId: string;
  documentType: PrintDocumentType;
  visible: Record<PrintSectionKey, boolean>;
  onChange: (next: Record<PrintSectionKey, boolean>) => void;
  sections?: PrintSectionKey[];
}) {
  const t = (key: TKey) => translate(locale, key);

  return (
    <div className="mx-auto mb-4 flex max-w-3xl items-start justify-between gap-4 print:hidden">
      <Link
        href={`/jobs/${jobId}`}
        className="flex items-center gap-1 self-center text-sm text-slate-500 hover:text-slate-800"
      >
        &larr; {t("back")}
      </Link>
      <div className="rounded-md border border-slate-300 bg-white p-3 text-xs text-slate-700">
        <p className="mb-1.5 font-medium">{t("printShowOnPrintout")}</p>
        {sections.map((key) => (
          <label key={key} className="flex items-center gap-1.5 py-0.5">
            <input
              type="checkbox"
              checked={visible[key]}
              onChange={(e) => onChange({ ...visible, [key]: e.target.checked })}
            />
            {t(SECTION_LABEL_KEY[key])}
          </label>
        ))}
      </div>
      <PrintButton label={t("printButtonLabel")} jobId={jobId} documentType={documentType} />
    </div>
  );
}
