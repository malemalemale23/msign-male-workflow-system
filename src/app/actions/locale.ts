"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALES, type Locale } from "@/lib/i18n";

export async function setLocale(locale: Locale) {
  if (!LOCALES.includes(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set("locale", locale, {
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
