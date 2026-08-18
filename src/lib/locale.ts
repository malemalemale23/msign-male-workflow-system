import "server-only";
import { cookies } from "next/headers";
import { LOCALES, type Locale } from "@/lib/i18n";

const DEFAULT_LOCALE: Locale = "en";

export async function getLocale(): Promise<Locale> {
  const raw = (await cookies()).get("locale")?.value;
  return LOCALES.includes(raw as Locale) ? (raw as Locale) : DEFAULT_LOCALE;
}
