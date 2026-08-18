import { redirect } from "next/navigation";
import { getAccess } from "@/lib/dal";
import { translate, type TKey } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getTheme } from "@/lib/theme";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { NewJobForm } from "@/components/NewJobForm";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const access = await getAccess();
  const locale = await getLocale();
  const theme = await getTheme();
  const t = (key: TKey) => translate(locale, key);

  if (!access.can("jobs.create")) {
    redirect("/home");
  }

  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppHeader access={access} locale={locale} theme={theme} backHref="/home" />

      <main className="mx-auto max-w-2xl space-y-6 p-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {t("newQuoteTitle")}
        </h1>

        {/* Fallback only: normal (JS-enabled) submission is validated
            client-side in NewJobForm before ever reaching the server, so
            this redirect-based path shouldn't fire in practice. Kept as a
            defensive backstop, e.g. if JS is disabled. */}
        {error === "missing_client" && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {t("newJobMissingClientError")}
          </p>
        )}

        <NewJobForm clients={clients} locale={locale} />
      </main>
    </div>
  );
}
