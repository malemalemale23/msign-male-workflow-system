import { redirect } from "next/navigation";
import { getAccess } from "@/lib/dal";
import { translate } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getTheme } from "@/lib/theme";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { RoleEditor } from "@/components/RoleEditor";
import { createRole } from "@/app/actions/roles";

export default async function RolesSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role: roleIdParam } = await searchParams;
  const access = await getAccess();
  const locale = await getLocale();
  const theme = await getTheme();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  if (!access.can("settings.manage")) {
    redirect("/home");
  }

  const roles = await prisma.role.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, nameTh: true, color: true },
  });
  if (roles.length === 0) {
    return null;
  }

  const selectedId = roles.some((r) => r.id === roleIdParam)
    ? roleIdParam!
    : roles[0].id;

  const selectedRole = await prisma.role.findUniqueOrThrow({
    where: { id: selectedId },
    include: {
      permissions: true,
      _count: { select: { users: true } },
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppHeader access={access} locale={locale} theme={theme} backHref="/home" />

      <main className="mx-auto max-w-4xl space-y-6 p-6 pb-24">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {t("roles")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("rolesPageDesc")}
          </p>
        </div>

        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t("addNewRole")}
          </h2>
          <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
            {t("addNewRoleDesc")}
          </p>
          <form action={createRole} className="flex flex-wrap items-center gap-2">
            <input
              type="color"
              name="color"
              defaultValue="#64748b"
              className="h-9 w-9 cursor-pointer rounded-md border border-slate-200 p-0.5 dark:border-slate-700"
            />
            <input
              name="name"
              placeholder={t("roleNamePlaceholder")}
              required
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <input
              name="nameTh"
              placeholder={t("roleNameThPlaceholder")}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300">
              {t("createRoleButton")}
            </button>
          </form>
        </section>

        <RoleEditor
          key={selectedRole.id}
          roles={roles}
          locale={locale}
          selected={{
            id: selectedRole.id,
            name: selectedRole.name,
            nameTh: selectedRole.nameTh,
            color: selectedRole.color,
            isSystem: selectedRole.isSystem,
            memberCount: selectedRole._count.users,
            enabledKeys: selectedRole.permissions.map((p) => p.key),
          }}
        />
      </main>
    </div>
  );
}
