import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt, type SessionPayload } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { PermissionKey } from "@/lib/permissions";

// Cached per request: safe to call verifySession() from many places without
// re-decrypting the cookie each time.
export const verifySession = cache(async (): Promise<SessionPayload> => {
  const cookie = (await cookies()).get("session")?.value;
  const session = await decrypt(cookie);

  // A signature can still verify against an older payload shape (e.g. before
  // roleId existed). Treat anything missing the fields we now rely on as
  // invalid rather than letting it crash downstream. Can't delete the cookie
  // here (Next only allows cookie writes in a Server Action/Route Handler,
  // not during render), but logging in again overwrites it with a valid one.
  if (!session?.userId || !session.roleId) {
    redirect("/login");
  }

  return session;
});

// Cached per request per roleId, dedupes across many components asking about
// the same role in one render pass.
const getRolePermissions = cache(async (roleId: string): Promise<Set<string>> => {
  const rows = await prisma.rolePermission.findMany({
    where: { roleId },
    select: { key: true },
  });
  return new Set(rows.map((r) => r.key));
});

export type Access = {
  session: SessionPayload;
  effectiveRole: { id: string; name: string; nameTh: string | null; color: string };
  isImpersonating: boolean;
  can: (key: PermissionKey) => boolean;
};

// The single source of truth for "what can be seen/done right now."
// - Not impersonating: isSuperAdmin bypasses every check; everyone else is
//   gated by their role's actual toggled permissions.
// - Impersonating (Admin using view-as): the bypass is suppressed on purpose,
//   so the preview shows exactly what that role can see, nothing more.
export const getAccess = cache(async (): Promise<Access> => {
  const session = await verifySession();

  let effectiveRole = {
    id: session.roleId,
    name: session.roleName,
    nameTh: null as string | null,
    color: "#64748b",
  };
  let isImpersonating = false;

  const realRole = await prisma.role.findUnique({
    where: { id: session.roleId },
    select: { id: true, name: true, nameTh: true, color: true },
  });
  if (realRole) effectiveRole = realRole;

  if (session.isSuperAdmin) {
    const viewAsId = (await cookies()).get("view_as")?.value;
    if (viewAsId && viewAsId !== session.roleId) {
      const viewAsRole = await prisma.role.findUnique({
        where: { id: viewAsId },
        select: { id: true, name: true, nameTh: true, color: true },
      });
      if (viewAsRole) {
        effectiveRole = viewAsRole;
        isImpersonating = true;
      }
    }
  }

  const permissions = await getRolePermissions(effectiveRole.id);

  const can = (key: PermissionKey) => {
    if (!isImpersonating && session.isSuperAdmin) return true;
    return permissions.has(key);
  };

  return { session, effectiveRole, isImpersonating, can };
});

// Use in Server Actions / Route Handlers that must reject instead of redirect.
// Always checks the REAL session (superAdmin bypass, real role's permissions),
// never the view-as override, so impersonation can never unlock a write.
export async function requirePermission(key: PermissionKey) {
  const session = await verifySession();
  if (session.isSuperAdmin) return session;

  const permissions = await getRolePermissions(session.roleId);
  if (!permissions.has(key)) {
    throw new Error("Not authorized for this action.");
  }
  return session;
}
