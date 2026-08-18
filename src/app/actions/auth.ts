"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";

const LoginSchema = z.object({
  username: z.string().min(1, "Enter your username."),
  password: z.string().min(1, "Enter your password."),
});

export type LoginState = { error?: "missing" | "invalid" } | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "missing" };
  }

  const { username, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { username },
    include: { role: true },
  });
  if (!user || !user.active) {
    return { error: "invalid" };
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return { error: "invalid" };
  }

  await createSession({
    userId: user.id,
    username: user.username,
    name: user.name,
    roleId: user.roleId,
    roleName: user.role.name,
    isSuperAdmin: user.isSuperAdmin,
  });

  redirect("/home");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
