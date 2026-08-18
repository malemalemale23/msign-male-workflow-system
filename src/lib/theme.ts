import "server-only";
import { cookies } from "next/headers";

export type Theme = "light" | "dark";

export async function getTheme(): Promise<Theme> {
  const raw = (await cookies()).get("theme")?.value;
  return raw === "dark" ? "dark" : "light";
}
