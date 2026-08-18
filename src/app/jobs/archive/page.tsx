import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccess } from "@/lib/dal";
import { translate, type TKey } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getTheme } from "@/lib/theme";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { clientDisplayName } from "@/lib/client-display";

type SortKey = "date" | "client" | "jobCode";

const SORT_OPTIONS: SortKey[] = ["date", "client", "jobCode"];

const SORT_LABEL_KEY: Record<SortKey, TKey> = {
  date: "archiveSortDate",
  client: "archiveSortClient",
  jobCode: "archiveSortJobCode",
};

function formatDate(d: Date | null | undefined) {
  if (!d) return "-";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMoney(n: number | null | undefined) {
  if (n == null) return "-";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export default async function JobArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;
  const access = await getAccess();
  const locale = await getLocale();
  const theme = await getTheme();
  const t = (key: TKey) => translate(locale, key);

  if (!access.can("jobs.view")) redirect("/home");

  const canSeePrice = access.can("jobs.view_price");
  const sortKey: SortKey = SORT_OPTIONS.includes(sort as SortKey) ? (sort as SortKey) : "date";
  // jobCode, client, jobName, qty, billingColReceived are always shown;
  // quotePrice is gated, so this has to track the <thead> column count.
  const columnCount = 5 + (canSeePrice ? 1 : 0);

  const jobsRaw = await prisma.job.findMany({
    where: { stage: "ARCHIVED" },
    include: { client: true, quote: canSeePrice, billing: true },
  });

  // Most recently closed first by default - that's the "old record" someone
  // is most likely looking for right after archiving a job.
  const jobs = [...jobsRaw].sort((a, b) => {
    if (sortKey === "client") {
      return clientDisplayName(locale, a.client).localeCompare(clientDisplayName(locale, b.client));
    }
    if (sortKey === "jobCode") {
      return a.jobCode.localeCompare(b.jobCode);
    }
    const aDate = a.billing?.paymentReceivedDate?.getTime() ?? 0;
    const bDate = b.billing?.paymentReceivedDate?.getTime() ?? 0;
    return bDate - aDate;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppHeader access={access} locale={locale} theme={theme} backHref="/jobs" />

      <main className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {t("archiveLink")}
          </h1>
          <div className="flex gap-1 rounded-md border border-slate-200 p-1 text-xs dark:border-slate-700">
            {SORT_OPTIONS.map((s) => (
              <Link
                key={s}
                href={`/jobs/archive?sort=${s}`}
                className={
                  "rounded px-2.5 py-1.5 font-medium " +
                  (sortKey === s
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800")
                }
              >
                {t(SORT_LABEL_KEY[s])}
              </Link>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">{t("jobCode")}</th>
                <th className="px-4 py-3">{t("client")}</th>
                <th className="px-4 py-3">{t("jobName")}</th>
                <th className="px-4 py-3 text-right">{t("qty")}</th>
                {canSeePrice && <th className="px-4 py-3">{t("quotePrice")}</th>}
                <th className="px-4 py-3">{t("billingColReceived")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    <Link href={`/jobs/${job.id}`} className="hover:underline">
                      {job.jobCode}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 dark:text-slate-300">
                    {clientDisplayName(locale, job.client)}
                  </td>
                  <td className="px-4 py-3 dark:text-slate-300">{job.jobName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right dark:text-slate-300">
                    {job.quantity.toLocaleString()}
                  </td>
                  {canSeePrice && (
                    <td className="px-4 py-3 dark:text-slate-300">
                      {formatMoney(job.quote?.quotePrice)}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                    {formatDate(job.billing?.paymentReceivedDate)}
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={columnCount} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    {t("archiveEmpty")}
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
