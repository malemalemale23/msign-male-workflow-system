import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccess } from "@/lib/dal";
import { translate, type TKey } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getTheme } from "@/lib/theme";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { clientDisplayName } from "@/lib/client-display";

type StatusFilter = "PENDING" | "PARTIAL" | "PAID";

const STATUS_OPTIONS: StatusFilter[] = ["PENDING", "PARTIAL", "PAID"];

const STATUS_LABEL_KEY: Record<StatusFilter, TKey> = {
  PENDING: "paymentPending",
  PARTIAL: "paymentPartial",
  PAID: "billingStatusPaid",
};

const STATUS_BADGE_CLASS: Record<StatusFilter, string> = {
  PENDING: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  PARTIAL: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  PAID: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

function money(n: number | null | undefined) {
  if (n == null) return "-";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function formatDate(d: Date | null | undefined) {
  if (!d) return "-";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const access = await getAccess();
  const locale = await getLocale();
  const theme = await getTheme();
  const t = (key: TKey, vars?: Record<string, string>) => translate(locale, key, vars);

  if (!access.can("billing.view")) redirect("/home");

  const statusFilter: StatusFilter | undefined = STATUS_OPTIONS.includes(status as StatusFilter)
    ? (status as StatusFilter)
    : undefined;

  const jobsRaw = await prisma.job.findMany({
    where: {
      billing: {
        invoiceNumber: { not: null },
        ...(statusFilter ? { paymentStatus: statusFilter } : {}),
      },
    },
    include: { client: true, billing: true },
  });

  // Unpaid first (most urgent due date first), paid last (most recently
  // received first) - urgency over recency, same rule as the Job Board.
  const jobs = [...jobsRaw].sort((a, b) => {
    const aPaid = a.billing!.paymentStatus === "PAID";
    const bPaid = b.billing!.paymentStatus === "PAID";
    if (aPaid !== bPaid) return aPaid ? 1 : -1;
    if (!aPaid) {
      const aDue = a.billing!.paymentDueDate?.getTime() ?? Infinity;
      const bDue = b.billing!.paymentDueDate?.getTime() ?? Infinity;
      return aDue - bDue;
    }
    const aReceived = a.billing!.paymentReceivedDate?.getTime() ?? 0;
    const bReceived = b.billing!.paymentReceivedDate?.getTime() ?? 0;
    return bReceived - aReceived;
  });

  const totalOutstanding = jobs
    .filter((j) => j.billing!.paymentStatus !== "PAID")
    .reduce((sum, j) => sum + (j.billing!.amountDue ?? 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppHeader access={access} locale={locale} theme={theme} backHref="/home" />

      <main className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-md border border-slate-200 p-1 text-xs dark:border-slate-700">
            <Link
              href="/billing"
              className={
                "rounded px-2.5 py-1.5 font-medium " +
                (!statusFilter
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800")
              }
            >
              {t("billingFilterAll")}
            </Link>
            {STATUS_OPTIONS.map((s) => (
              <Link
                key={s}
                href={`/billing?status=${s}`}
                className={
                  "rounded px-2.5 py-1.5 font-medium " +
                  (statusFilter === s
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800")
                }
              >
                {t(STATUS_LABEL_KEY[s])}
              </Link>
            ))}
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("billingTotalOutstanding", { amount: money(totalOutstanding) })}
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">{t("jobCode")}</th>
                <th className="px-4 py-3">{t("client")}</th>
                <th className="px-4 py-3">{t("invoiceNumberLabel")}</th>
                <th className="px-4 py-3 text-right">{t("amountDueLabel")}</th>
                <th className="px-4 py-3">{t("paymentStatusLabel")}</th>
                <th className="px-4 py-3">{t("paymentDueDateLabel")}</th>
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
                  <td className="whitespace-nowrap px-4 py-3 dark:text-slate-300">
                    {job.billing!.invoiceNumber}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right dark:text-slate-300">
                    {money(job.billing!.amountDue)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={
                        "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium " +
                        STATUS_BADGE_CLASS[job.billing!.paymentStatus as StatusFilter]
                      }
                    >
                      {t(STATUS_LABEL_KEY[job.billing!.paymentStatus as StatusFilter])}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 dark:text-slate-300">
                    {formatDate(job.billing!.paymentDueDate)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 dark:text-slate-300">
                    {formatDate(job.billing!.paymentReceivedDate)}
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    {t("billingListEmpty")}
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
