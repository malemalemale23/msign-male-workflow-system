"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";

export async function setViewAs(roleId: string) {
  // Checks the REAL session, not any existing view-as cookie, so an admin
  // who's currently impersonating can still switch or clear it.
  const session = await verifySession();
  if (!session.isSuperAdmin) {
    throw new Error("Only an admin can preview other roles.");
  }

  const cookieStore = await cookies();
  if (roleId === session.roleId || roleId === "") {
    cookieStore.delete("view_as");
  } else {
    cookieStore.set("view_as", roleId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }

  revalidatePath("/", "layout");
}
