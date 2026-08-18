"use client";

import { useState } from "react";
import Link from "next/link";
import { DUE_STATUS_COLOR, type DueBucket } from "@/lib/due-status";
import { translate, type Locale, type TKey } from "@/lib/i18n";

export type ChartJob = { id: string; displayName: string; clientName: string };
export type ChartColorBucket = DueBucket | "onHold";
export type ChartBucket = {
  key: string;
  label: string;
  colorBucket: ChartColorBucket;
  jobs: ChartJob[];
};
export type StageChartData = {
  stageKey: string;
  stageLabel: string;
  buckets: ChartBucket[];
  overdueCount: number;
  dueTodayCount: number;
};

const BAR_HEIGHT_PX = 100;
const TOOLTIP_JOB_CAP = 6;

// Neutral, deliberately outside the red/amber/green urgency palette - a
// held job is a display override, not a real overdue/today/upcoming state.
const CHART_COLOR: Record<ChartColorBucket, string> = {
  ...DUE_STATUS_COLOR,
  onHold: "#94a3b8",
};

type VisibilityMode = "all" | "compact" | "overdue" | "today";

export function ProcessStepCharts({
  stages,
  locale,
  activeStage,
  activeBucket,
}: {
  stages: StageChartData[];
  locale: Locale;
  activeStage?: string;
  activeBucket?: string;
}) {
  const t = (key: TKey) => translate(locale, key);
  const [mode, setMode] = useState<VisibilityMode>("all");
  const [hover, setHover] = useState<{ stage: string; bucket: string } | null>(null);

  const visibleStages = stages.filter((s) => {
    if (mode === "compact") return s.buckets.length > 0;
    if (mode === "overdue") return s.overdueCount > 0;
    if (mode === "today") return s.dueTodayCount > 0;
    return true;
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {t("jobsByStageDueDate")}
        </h2>
        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          {t("chartVisibilityLabel")}
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as VisibilityMode)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="all">{t("chartVisibilityAll")}</option>
            <option value="compact">{t("chartVisibilityCompact")}</option>
            <option value="overdue">{t("segOverdue")}</option>
            <option value="today">{t("segDueToday")}</option>
          </select>
        </label>
      </div>

      {visibleStages.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
          {t("chartStageEmpty")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleStages.map((stage) => {
            const maxCount = Math.max(1, ...stage.buckets.map((b) => b.jobs.length));
            return (
              <div
                key={stage.stageKey}
                className="rounded-md border border-slate-100 p-3 dark:border-slate-800"
              >
                <Link
                  href={
                    activeStage === stage.stageKey && !activeBucket
                      ? "/jobs"
                      : `/jobs?stage=${stage.stageKey}`
                  }
                  scroll={false}
                  className={
                    "mb-2 block w-fit text-xs font-semibold hover:underline " +
                    (activeStage === stage.stageKey && !activeBucket
                      ? "text-slate-900 dark:text-slate-100"
                      : "text-slate-600 dark:text-slate-300")
                  }
                >
                  {stage.stageLabel}
                </Link>
                {stage.buckets.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                    {t("chartStageEmpty")}
                  </p>
                ) : (
                  <div className="flex flex-wrap items-end gap-2 pt-6 pb-1">
                    {stage.buckets.map((bucket) => {
                      const count = bucket.jobs.length;
                      const barHeight = Math.max(4, Math.round((count / maxCount) * BAR_HEIGHT_PX));
                      const isHovered = hover?.stage === stage.stageKey && hover?.bucket === bucket.key;
                      const isActive = activeStage === stage.stageKey && activeBucket === bucket.key;
                      return (
                        <Link
                          key={bucket.key}
                          href={
                            isActive
                              ? "/jobs"
                              : `/jobs?stage=${stage.stageKey}&bucket=${bucket.key}`
                          }
                          scroll={false}
                          onMouseEnter={() => setHover({ stage: stage.stageKey, bucket: bucket.key })}
                          onMouseLeave={() => setHover(null)}
                          onFocus={() => setHover({ stage: stage.stageKey, bucket: bucket.key })}
                          onBlur={() => setHover(null)}
                          className={
                            "relative flex shrink-0 flex-col items-center " +
                            (isHovered ? "z-20" : "z-0")
                          }
                        >
                          <span className="mb-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                            {count}
                          </span>
                          <div
                            className={
                              "relative w-7 rounded-t-[4px] " +
                              (isActive ? "ring-2 ring-offset-1 ring-slate-900 dark:ring-slate-100" : "")
                            }
                            style={{
                              height: barHeight,
                              backgroundColor: CHART_COLOR[bucket.colorBucket],
                              filter: isHovered ? "brightness(1.12)" : undefined,
                            }}
                          >
                            {isHovered && (
                              <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-max max-w-[12rem] -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1.5 text-left text-xs text-white shadow-lg">
                                {bucket.jobs.slice(0, TOOLTIP_JOB_CAP).map((j) => (
                                  <p key={j.id} className="whitespace-nowrap">
                                    {j.displayName} &middot; {j.clientName}
                                  </p>
                                ))}
                                {bucket.jobs.length > TOOLTIP_JOB_CAP && (
                                  <p className="text-slate-300">
                                    +{bucket.jobs.length - TOOLTIP_JOB_CAP}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <span className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                            {bucket.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
