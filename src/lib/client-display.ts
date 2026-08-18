import type { Locale } from "@/lib/i18n";

// Thai name is optional (older/legacy clients may not have one yet), falls
// back to the English name rather than showing blank.
export function clientDisplayName(
  locale: Locale,
  client: { name: string; nameTh: string | null }
) {
  if (locale === "th" && client.nameTh) return client.nameTh;
  return client.name;
}
