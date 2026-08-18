import { COMPANY } from "@/lib/company";

// Shared letterhead block for every printable document (Quotation, Sale
// Order, Tax Invoice, Billing Statement, Receipt) so company info only needs
// updating in one place instead of five near-identical copies.
export function PrintLetterhead() {
  return (
    <div className="mb-6 border-b border-slate-300 pb-4 text-center">
      <p className="text-base font-semibold">{COMPANY.nameTh}</p>
      <p className="text-sm">{COMPANY.nameEn}</p>
      <p className="mt-1 text-xs text-slate-600">{COMPANY.addressTh}</p>
      <p className="text-xs text-slate-600">{COMPANY.addressEn}</p>
      <p className="mt-1 text-xs text-slate-600">
        Tel. {COMPANY.tel} &middot; Tax ID {COMPANY.taxId}
      </p>
    </div>
  );
}
