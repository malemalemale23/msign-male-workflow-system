import { notFound, redirect } from "next/navigation";
import { getAccess } from "@/lib/dal";
import { translate, type TKey } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getTheme } from "@/lib/theme";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { updateUser } from "@/app/actions/users";
import { roleDisplayName } from "@/lib/role-display";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await getAccess();
  const locale = await getLocale();
  const theme = await getTheme();
  const t = (key: TKey) => translate(locale, key);

  if (!access.can("users.manage")) redirect("/home");

  const [user, roles] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.role.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  if (!user) notFound();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppHeader access={access} locale={locale} theme={theme} backHref="/users" />

      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <form action={updateUser.bind(null, user.id)} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs text-slate-500 dark:text-slate-400">
                {t("userFieldName")}
                <input
                  name="name"
                  required
                  defaultValue={user.name}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="block text-xs text-slate-500 dark:text-slate-400">
                {t("userFieldUsername")}
                <input
                  name="username"
                  required
                  autoComplete="off"
                  defaultValue={user.username}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="block text-xs text-slate-500 dark:text-slate-400">
                {t("userFieldNewPassword")}
                <input
                  type="password"
                  name="newPassword"
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="block text-xs text-slate-500 dark:text-slate-400">
                {t("userFieldRole")}
                <select
                  name="roleId"
                  required
                  defaultValue={user.roleId}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {roleDisplayName(locale, role)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" name="active" defaultChecked={user.active} />
              {t("userFieldActive")}
            </label>
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              {t("saveUserButton")}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
