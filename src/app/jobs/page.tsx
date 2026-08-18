import Link from "next/link";
import { getAccess } from "@/lib/dal";
import { translate, type TKey } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getTheme } from "@/lib/theme";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import {
  ProcessStepCharts,
  type StageChartData,
  type ChartBucket,
} from "@/components/ProcessStepCharts";
import { STAGE_ORDER, STAGE_LABEL_KEY } from "@/lib/stages";
import {
  dueBucket,
  formatDueLabel,
  dayBucketKey,
  dayBucketDateLabel,
  DUE_BADGE_CLASS,
} from "@/lib/due-status";
import { clientDisplayName } from "@/lib/client-display";

const BUCKET_ORDER = ["overdue", "today", "d1", "d2", "d3", "d4", "d5", "d6", "d7", "later", "onHold"];

function formatDate(d: Date | null) {
  if (!d) return "-";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(n: number | null | undefined) {
  if (n == null) return "-";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; bucket?: string }>;
}) {
  const { stage: filterStage, bucket: filterBucket } = await searchParams;
  const access = await getAccess();
  const locale = await getLocale();
  const theme = await getTheme();
  const t = (key: TKey) => translate(locale, key);

  const canSeePrice = access.can("jobs.view_price");
  const canSeeCost = access.can("jobs.view_cost");
  const canSeeProduction = access.can("jobs.view_production");

  // jobCode, client, jobName, qty, stage, deliveryDue are always shown;
  // the rest are gated by permission, so the empty-state colspan below has
  // to track the same conditions as the <thead> or it won't span the table.
  const columnCount =
    6 + (canSeeProduction ? 2 : 0) + (canSeePrice ? 1 : 0) + (canSeeCost ? 2 : 0);

  // Archived (closed/paid) jobs have their own page (/jobs/archive) now,
  // keeps the active board focused on jobs still in motion.
  const jobsRaw = await prisma.job.findMany({
    where: { stage: { not: "ARCHIVED" } },
    orderBy: { createdAt: "desc" },
    include: {
      client: true,
      quote: canSeePrice || canSeeCost,
      actualCost: canSeeCost,
    },
  });

  const now = new Date();

  // Most urgent first, not most recently created: an old job due tomorrow
  // matters more right now than a job just created that isn't due for weeks.
  const sortedJobs = [...jobsRaw].sort((a, b) => {
    const aDue = a.deliveryDueDate?.getTime() ?? Infinity;
    const bDue = b.deliveryDueDate?.getTime() ?? Infinity;
    return aDue - bDue;
  });

  const jobs = filterStage
    ? sortedJobs.filter(
        (j) =>
          j.stage === filterStage &&
          (!filterBucket || dayBucketKey(j.deliveryDueDate, j.onHold, now) === filterBucket)
      )
    : sortedJobs;

  const bucketColor = (key: string): ChartBucket["colorBucket"] => {
    if (key === "overdue") return "overdue";
    if (key === "today") return "dueToday";
    if (key === "onHold") return "onHold";
    return "upcoming";
  };
  const bucketLabel = (key: string) => {
    if (key === "overdue") return t("segOverdue");
    if (key === "today") return t("segDueToday");
    if (key === "later") return t("chartLaterLabel");
    if (key === "onHold") return t("onHoldBadge");
    return dayBucketDateLabel(Number(key.slice(1)), now);
  };

  // "Stuck at which step" excludes Archived, a finished job isn't stuck -
  // one small chart per stage, bars are individual due-date buckets rather
  // than one lumped "upcoming" segment, so a specific date can be clicked.
  const chartStages: StageChartData[] = STAGE_ORDER.filter(
    (s) => s.key !== "ARCHIVED"
  ).map((s) => {
    const jobsInStage = sortedJobs.filter((j) => j.stage === s.key);
    const byBucket = new Map<string, typeof jobsInStage>();
    for (const job of jobsInStage) {
      const key = dayBucketKey(job.deliveryDueDate, job.onHold, now);
      byBucket.set(key, [...(byBucket.get(key) ?? []), job]);
    }
    const buckets: ChartBucket[] = BUCKET_ORDER.filter((key) => byBucket.has(key)).map((key) => ({
      key,
      label: bucketLabel(key),
      colorBucket: bucketColor(key),
      jobs: byBucket.get(key)!.map((j) => ({
        id: j.id,
        displayName: j.shortName ?? j.jobName,
        clientName: clientDisplayName(locale, j.client),
      })),
    }));
    return {
      stageKey: s.key,
      stageLabel: translate(locale, STAGE_LABEL_KEY[s.key]),
      buckets,
      // Held jobs don't count toward urgency filters - that's the point of
      // holding them.
      overdueCount: jobsInStage.filter((j) => !j.onHold && dueBucket(j.deliveryDueDate) === "overdue").length,
      dueTodayCount: jobsInStage.filter((j) => !j.onHold && dueBucket(j.deliveryDueDate) === "dueToday").length,
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppHeader access={access} locale={locale} theme={theme} backHref="/home" />

      <main className="p-6">
        <div className="mb-4">
          <ProcessStepCharts
            stages={chartStages}
            locale={locale}
            activeStage={filterStage}
            activeBucket={filterBucket}
          />
        </div>

        {filterStage && (
          <div className="mb-4 flex items-center justify-between rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <span>
              {t("filteredByChart")}:{" "}
              {STAGE_LABEL_KEY[filterStage]
                ? translate(locale, STAGE_LABEL_KEY[filterStage])
                : filterStage}
              {filterBucket && <> &middot; {bucketLabel(filterBucket)}</>}
            </span>
            <Link href="/jobs" scroll={false} className="font-medium underline hover:no-underline">
              {t("clearFilterLink")}
            </Link>
          </div>
        )}

        <div className="mb-4 flex justify-end gap-2">
          <Link
            href="/jobs/archive"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t("archiveLink")}
          </Link>
          {access.can("jobs.create") && (
            <Link
              href="/jobs/new"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              + New Quote
            </Link>
          )}
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">{t("jobCode")}</th>
                <th className="px-4 py-3">{t("client")}</th>
                <th className="px-4 py-3">{t("jobName")}</th>
                <th className="px-4 py-3 text-right">{t("qty")}</th>
                {canSeeProduction && <th className="px-4 py-3">{t("paper")}</th>}
                {canSeeProduction && <th className="px-4 py-3">{t("process")}</th>}
                <th className="px-4 py-3">{t("stage")}</th>
                {canSeePrice && <th className="px-4 py-3">{t("quotePrice")}</th>}
                {canSeeCost && <th className="px-4 py-3">{t("estCost")}</th>}
                {canSeeCost && <th className="px-4 py-3">{t("actualProfit")}</th>}
                <th className="px-4 py-3">{t("deliveryDue")}</th>
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
                  {canSeeProduction && (
                    <td className="px-4 py-3 dark:text-slate-300">
                      {[job.paperType, job.paperWeight].filter(Boolean).join(" / ") || "-"}
                    </td>
                  )}
                  {canSeeProduction && (
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                      {[
                        job.hasDesign && t("finishDesign"),
                        job.hasMock && t("finishMock"),
                        job.hasPlate && t("finishPlate"),
                        job.hasEmboss && t("finishEmboss"),
                        job.hasVarnish && t("finishVarnish"),
                        job.hasGlue && t("finishGlue"),
                        job.hasDieCut && t("finishDieCut"),
                        job.hasHotStamp && t("finishHotStamp"),
                        job.hasKCoating && t("finishKCoating"),
                        job.hasFolding && t("finishFolding"),
                      ]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="inline-block whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {STAGE_LABEL_KEY[job.stage]
                        ? translate(locale, STAGE_LABEL_KEY[job.stage])
                        : job.stage}
                    </span>
                  </td>
                  {canSeePrice && (
                    <td className="px-4 py-3 dark:text-slate-300">
                      {formatMoney(job.quote?.quotePrice)}
                    </td>
                  )}
                  {canSeeCost && (
                    <td className="px-4 py-3 text-xs dark:text-slate-400">
                      {job.quote
                        ? `${formatMoney(job.quote.estimatedDM)} / ${formatMoney(
                            job.quote.estimatedDL
                          )} / ${formatMoney(job.quote.estimatedMOH)}`
                        : "-"}
                    </td>
                  )}
                  {canSeeCost && (
                    <td className="px-4 py-3 dark:text-slate-300">
                      {formatMoney(job.actualCost?.actualProfit)}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-4 py-3">
                    {job.onHold ? (
                      <span
                        title={job.holdReason ?? undefined}
                        className="inline-block whitespace-nowrap rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      >
                        {t("onHoldBadge")}
                      </span>
                    ) : (
                      <span
                        title={formatDate(job.deliveryDueDate)}
                        className={
                          "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium " +
                          DUE_BADGE_CLASS[dueBucket(job.deliveryDueDate)]
                        }
                      >
                        {formatDueLabel(locale, job.deliveryDueDate)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={columnCount} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    {t("noJobsYet")}
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
