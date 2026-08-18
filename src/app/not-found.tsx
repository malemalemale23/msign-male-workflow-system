import Link from "next/link";
import { translate } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

// Reached whenever notFound() is called (bad job/client/material/user id -
// see the various [id] pages) or a route just doesn't match anything.
export default async function NotFound() {
  const locale = await getLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center dark:bg-slate-950">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        {t("notFoundTitle")}
      </h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {t("notFoundDesc")}
      </p>
      <Link
        href="/home"
        className="mt-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
      >
        {t("backToHomeButton")}
      </Link>
    </div>
  );
}
