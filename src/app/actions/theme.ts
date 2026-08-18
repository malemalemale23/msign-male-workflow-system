"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { Theme } from "@/lib/theme";

export async function setTheme(theme: Theme) {
  const cookieStore = await cookies();
  cookieStore.set("theme", theme, {
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
