import "server-only";
import { prisma } from "@/lib/prisma";
import type { ActivityType } from "@/generated/prisma/client";
import type { PermissionKey } from "@/lib/permissions";

// No permission check here - callers are actions that already checked
// before mutating the job, this just records what happened.
export async function logActivity(
  jobId: string,
  actorId: string,
  type: ActivityType,
  detail: string
) {
  await prisma.activityLog.create({ data: { jobId, actorId, type, detail } });
}

// Fixed rule, called explicitly by the one action that needs it (see the
// design doc for why this isn't a configurable rules engine) - every
// active user whose role has this permission, plus every isSuperAdmin
// user (who bypass permission checks entirely, so they should always be
// reachable too).
export async function notifyByPermission(jobId: string, stage: string, permissionKey: PermissionKey) {
  const roles = await prisma.role.findMany({
    where: { permissions: { some: { key: permissionKey } } },
    select: { id: true },
  });
  const roleIds = roles.map((r) => r.id);

  const recipients = await prisma.user.findMany({
    where: {
      active: true,
      OR: [{ roleId: { in: roleIds } }, { isSuperAdmin: true }],
    },
    select: { id: true },
  });

  if (recipients.length === 0) return;
  await prisma.notification.createMany({
    data: recipients.map((r) => ({ userId: r.id, jobId, stage })),
  });
}
