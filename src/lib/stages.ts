import type { TKey } from "@/lib/i18n";

export const STAGE_ORDER = [
  { key: "QUOTATION" },
  { key: "PURCHASE_ORDER" },
  { key: "SALE_ORDER" },
  { key: "PRODUCTION" },
  { key: "QC" },
  { key: "DELIVERY" },
  { key: "BILLING" },
  { key: "ARCHIVED" },
] as const;

// Maps each stage enum value to its i18n dictionary key, keeps stage names
// out of code so every stage name has both an English and Thai form.
export const STAGE_LABEL_KEY: Record<string, TKey> = {
  QUOTATION: "stageQuotation",
  PURCHASE_ORDER: "stagePO",
  SALE_ORDER: "stageSaleOrder",
  PRODUCTION: "stageProduction",
  QC: "stageQC",
  DELIVERY: "stageDelivery",
  BILLING: "stageBilling",
  ARCHIVED: "stageArchived",
};
