import { redirect } from "next/navigation";
import { getAccess } from "@/lib/dal";
import { translate, type TKey } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getTheme } from "@/lib/theme";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { createUser } from "@/app/actions/users";
import { roleDisplayName } from "@/lib/role-display";

export default async function NewUserPage() {
  const access = await getAccess();
  const locale = await getLocale();
  const theme = await getTheme();
  const t = (key: TKey) => translate(locale, key);

  if (!access.can("users.manage")) redirect("/home");

  const roles = await prisma.role.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppHeader access={access} locale={locale} theme={theme} backHref="/users" />

      <main className="mx-auto max-w-2xl space-y-6 p-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {t("newUserButton")}
        </h1>

        <form action={createUser} className="space-y-6">
          <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs text-slate-500 dark:text-slate-400">
                {t("userFieldName")}
                <input
                  name="name"
                  required
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="block text-xs text-slate-500 dark:text-slate-400">
                {t("userFieldUsername")}
                <input
                  name="username"
                  required
                  autoComplete="off"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="block text-xs text-slate-500 dark:text-slate-400">
                {t("userFieldPassword")}
                <input
                  type="password"
                  name="password"
                  required
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="block text-xs text-slate-500 dark:text-slate-400">
                {t("userFieldRole")}
                <select
                  name="roleId"
                  required
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
          </section>

          <button
            type="submit"
            className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            {t("createUserButton")}
          </button>
        </form>
      </main>
    </div>
  );
}
