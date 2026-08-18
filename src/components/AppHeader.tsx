import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { setViewAs } from "@/app/actions/view-as";
import { ViewAsSelect } from "@/components/ViewAsSelect";
import { NotificationBell } from "@/components/NotificationBell";
import { setLocale } from "@/app/actions/locale";
import { setTheme } from "@/app/actions/theme";
import type { Theme } from "@/lib/theme";
import { prisma } from "@/lib/prisma";
import { translate, type Locale } from "@/lib/i18n";
import { roleDisplayName } from "@/lib/role-display";
import { STAGE_LABEL_KEY } from "@/lib/stages";
import type { Access } from "@/lib/dal";

export async function AppHeader({
  access,
  locale,
  theme,
  backHref,
}: {
  access: Access;
  locale: Locale;
  theme: Theme;
  backHref?: string;
}) {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string>) =>
    translate(locale, key, vars);

  const { session, effectiveRole, isImpersonating, can } = access;

  const roles = session.isSuperAdmin
    ? await prisma.role.findMany({ orderBy: { createdAt: "asc" } })
    : [];

  const notificationRows = await prisma.notification.findMany({
    where: { userId: session.userId },
    orderBy: [{ read: "asc" }, { createdAt: "desc" }],
    take: 10,
    include: { job: true },
  });
  const notifications = notificationRows.map((n) => ({
    id: n.id,
    jobId: n.jobId,
    jobCode: n.job.jobCode,
    stageLabel: STAGE_LABEL_KEY[n.stage] ? translate(locale, STAGE_LABEL_KEY[n.stage]) : n.stage,
    read: n.read,
    createdAt: n.createdAt,
  }));

  return (
    <>
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          {backHref && (
            <Link
              href={backHref}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
            >
              &larr; {t("back")}
            </Link>
          )}
          <Link
            href="/home"
            className="text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            M Sign Workflow
          </Link>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {session.name} &middot; {roleDisplayName(locale, effectiveRole)}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {can("settings.manage") && (
            <Link
              href="/settings/roles"
              className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
            >
              {t("settings")}
            </Link>
          )}

          <div className="flex items-center gap-1 rounded-md border border-slate-200 p-1 text-xs dark:border-slate-700">
            <form action={setTheme.bind(null, "light" as Theme)}>
              <button
                type="submit"
                title="Light mode"
                className={
                  "rounded px-2.5 py-1.5 font-medium " +
                  (theme === "light"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800")
                }
              >
                Light
              </button>
            </form>
            <form action={setTheme.bind(null, "dark" as Theme)}>
              <button
                type="submit"
                title="Dark mode"
                className={
                  "rounded px-2.5 py-1.5 font-medium " +
                  (theme === "dark"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800")
                }
              >
                Dark
              </button>
            </form>
          </div>

          <div className="flex items-center gap-1 rounded-md border border-slate-200 p-1 text-xs dark:border-slate-700">
            <form action={setLocale.bind(null, "en")}>
              <button
                type="submit"
                className={
                  "rounded px-2.5 py-1.5 font-medium " +
                  (locale === "en"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800")
                }
              >
                EN
              </button>
            </form>
            <form action={setLocale.bind(null, "th")}>
              <button
                type="submit"
                className={
                  "rounded px-2.5 py-1.5 font-medium " +
                  (locale === "th"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800")
                }
              >
                TH
              </button>
            </form>
          </div>

          {session.isSuperAdmin && roles.length > 0 && (
            <ViewAsSelect
              roles={roles}
              currentRoleId={effectiveRole.id}
              label={t("viewAs")}
              locale={locale}
            />
          )}

          <NotificationBell notifications={notifications} locale={locale} />

          <form action={logout}>
            <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              {t("signOut")}
            </button>
          </form>
        </div>
      </header>

      {isImpersonating && (
        <div className="bg-amber-100 px-6 py-2 text-center text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {t("viewingAsBanner", { role: roleDisplayName(locale, effectiveRole) })}{" "}
          <form action={setViewAs.bind(null, session.roleId)} className="inline">
            <button type="submit" className="underline font-medium">
              {t("returnToAdmin")}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
