import type { Locale } from "@/lib/i18n";

// Same fallback pattern as clientDisplayName: Thai name is optional, falls
// back to English rather than showing blank.
export function roleDisplayName(
  locale: Locale,
  role: { name: string; nameTh: string | null }
) {
  if (locale === "th" && role.nameTh) return role.nameTh;
  return role.name;
}
