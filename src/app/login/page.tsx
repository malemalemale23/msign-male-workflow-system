import { translate } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getTheme } from "@/lib/theme";
import { setLocale } from "@/app/actions/locale";
import { setTheme } from "@/app/actions/theme";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const locale = await getLocale();
  const theme = await getTheme();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <div className="relative min-h-screen bg-slate-100 dark:bg-slate-950">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1 text-xs dark:border-slate-700 dark:bg-slate-900">
          <form action={setTheme.bind(null, "light")}>
            <button
              type="submit"
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
          <form action={setTheme.bind(null, "dark")}>
            <button
              type="submit"
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

        <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1 text-xs dark:border-slate-700 dark:bg-slate-900">
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
      </div>

      <LoginForm
        labels={{
          title: "M Sign Workflow",
          subtitle: t("signInSubtitle"),
          username: t("username"),
          password: t("password"),
          signIn: t("signIn"),
          signingIn: t("signingIn"),
          invalidLogin: t("invalidLogin"),
          enterBoth: t("enterBoth"),
        }}
      />
    </div>
  );
}
