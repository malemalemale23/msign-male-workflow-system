import type { TKey } from "@/lib/i18n";

// Maps each product type enum value to its i18n dictionary key, same pattern
// as STAGE_LABEL_KEY - keeps product type names bilingual instead of always
// showing English regardless of the app's locale toggle.
export const PRODUCT_TYPE_LABEL_KEY: Record<string, TKey> = {
  BOX: "productTypeBox",
  CARD: "productTypeCard",
  TAG: "productTypeTag",
  FOLDED_CARD: "productTypeFoldedCard",
  PACKAGING: "productTypePackaging",
  MENU: "productTypeMenu",
  STICKER: "productTypeSticker",
  OTHER: "productTypeOther",
};
