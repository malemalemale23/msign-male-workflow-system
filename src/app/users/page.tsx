import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccess } from "@/lib/dal";
import { translate } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getTheme } from "@/lib/theme";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { roleDisplayName } from "@/lib/role-display";

export default async function UsersPage() {
  const access = await getAccess();
  const locale = await getLocale();
  const theme = await getTheme();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  if (!access.can("users.manage")) redirect("/home");

  const usersRaw = await prisma.user.findMany({
    include: { role: true },
    orderBy: { name: "asc" },
  });
  // Active accounts are the current business, inactive ones sink to the
  // bottom - same idea as archived jobs sinking below active ones.
  const users = [...usersRaw].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppHeader access={access} locale={locale} theme={theme} backHref="/home" />

      <main className="p-6">
        <div className="mb-4 flex justify-end">
          <Link
            href="/users/new"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            {t("newUserButton")}
          </Link>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">{t("userFieldName")}</th>
                <th className="px-4 py-3">{t("userFieldUsername")}</th>
                <th className="px-4 py-3">{t("userFieldRole")}</th>
                <th className="px-4 py-3">{t("userFieldActive")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    <Link href={`/users/${user.id}`} className="hover:underline">
                      {user.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 dark:text-slate-300">{user.username}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className="inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: user.role.color }}
                    >
                      {roleDisplayName(locale, user.role)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={
                        "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium " +
                        (user.active
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")
                      }
                    >
                      {t(user.active ? "userStatusActive" : "userStatusInactive")}
                    </span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    {t("usersListEmpty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
