"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";

const PERMISSION_KEYS = new Set<string>(PERMISSIONS.map((p) => p.key));

export async function createRole(formData: FormData) {
  await requirePermission("settings.manage");

  const name = String(formData.get("name") ?? "").trim();
  const nameTh = String(formData.get("nameTh") ?? "").trim();
  const color = String(formData.get("color") ?? "#64748b");
  if (!name) return;

  await prisma.role.create({ data: { name, nameTh: nameTh || null, color } });
  revalidatePath("/settings/roles");
}

export async function deleteRole(roleId: string) {
  await requirePermission("settings.manage");

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { _count: { select: { users: true } } },
  });
  // Defensive: the page already hides this action for system roles and
  // roles with members, this just makes sure a direct call can't bypass it.
  if (!role || role.isSystem || role._count.users > 0) return;

  await prisma.role.delete({ where: { id: roleId } });
  revalidatePath("/settings/roles");
}

// One batch save for name + color + the full permission set, called directly
// from the RoleEditor client component (not a <form action>), so the whole
// draft commits atomically when "Save changes" is clicked, matching the
// unsaved-changes bar pattern rather than saving field by field.
export async function saveRole(
  roleId: string,
  data: { name: string; nameTh: string; color: string; permissionKeys: string[] }
) {
  await requirePermission("settings.manage");

  const name = data.name.trim();
  if (!name) throw new Error("Role name can't be empty.");
  const nameTh = data.nameTh.trim();
  const keys = data.permissionKeys.filter((k) => PERMISSION_KEYS.has(k));

  await prisma.$transaction([
    prisma.role.update({
      where: { id: roleId },
      data: { name, nameTh: nameTh || null, color: data.color },
    }),
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: keys.map((key) => ({ roleId, key })),
    }),
  ]);

  revalidatePath("/settings/roles");
  revalidatePath("/home");
  revalidatePath("/jobs");
}
