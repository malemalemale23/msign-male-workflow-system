"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export async function createUser(formData: FormData) {
  await requirePermission("users.manage");

  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const roleId = String(formData.get("roleId") ?? "");
  if (!name || !username || !password || !roleId) return;

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, username, passwordHash, roleId, active: true },
  });

  revalidatePath("/users");
  redirect(`/users/${user.id}`);
}

export async function updateUser(userId: string, formData: FormData) {
  await requirePermission("users.manage");

  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const roleId = String(formData.get("roleId") ?? "");
  const active = formData.get("active") === "on";
  if (!name || !username || !roleId) throw new Error("Name, username, and role are required.");

  const newPassword = String(formData.get("newPassword") ?? "");
  const passwordHash = newPassword ? await bcrypt.hash(newPassword, 10) : undefined;

  await prisma.user.update({
    where: { id: userId },
    data: { name, username, roleId, active, ...(passwordHash ? { passwordHash } : {}) },
  });

  revalidatePath("/users");
  revalidatePath(`/users/${userId}`);
}
