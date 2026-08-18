"use client";

import { useState } from "react";

export type ReportBarRow = {
  key: string;
  label: string;
  value: number;
};

const REVENUE_COLOR = "#7c3aed"; // violet-600, matches the Costing tile icon
const PROFIT_COLOR = "#0ca30c"; // same green as the "upcoming" due-date badge
const LOSS_COLOR = "#d03b3b"; // same red as the "overdue" due-date badge
const CHART_HEIGHT_PX = 160;
const MAX_BAR_THICKNESS_PX = 24;

function money(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

// Single reusable bar chart for the three Costing & Profit reports. Every
// report here is one series, so no legend box (a single color needs no
// identity key, the section heading already names what's plotted).
// Props are plain data only (no functions) since this crosses the
// server-to-client component boundary.
export function ReportBarChart({
  rows,
  orientation,
  variant = "flat",
  emptyLabel,
}: {
  rows: ReportBarRow[];
  orientation: "vertical" | "horizontal";
  variant?: "flat" | "diverging";
  emptyLabel: string;
}) {
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const getColor = (value: number) =>
    variant === "diverging" ? (value >= 0 ? PROFIT_COLOR : LOSS_COLOR) : REVENUE_COLOR;
  const valueFormatter = money;

  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
        {emptyLabel}
      </p>
    );
  }

  if (orientation === "horizontal") {
    const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
    return (
      <div className="space-y-2.5">
        {rows.map((row) => {
          const widthPct = Math.max(1, (Math.abs(row.value) / maxAbs) * 100);
          const isHovered = hoverKey === row.key;
          return (
            <div key={row.key} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-xs text-slate-600 dark:text-slate-400">
                {row.label}
              </span>
              <div className="relative flex-1">
                <div
                  tabIndex={0}
                  role="img"
                  aria-label={`${row.label}: ${valueFormatter(row.value)}`}
                  onMouseEnter={() => setHoverKey(row.key)}
                  onMouseLeave={() => setHoverKey(null)}
                  onFocus={() => setHoverKey(row.key)}
                  onBlur={() => setHoverKey(null)}
                  className="relative cursor-default rounded-r-[4px] outline-none"
                  style={{
                    width: `${widthPct}%`,
                    height: MAX_BAR_THICKNESS_PX,
                    backgroundColor: getColor(row.value),
                    filter: isHovered ? "brightness(1.12)" : undefined,
                  }}
                >
                  {isHovered && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow-lg">
                      {valueFormatter(row.value)}
                    </div>
                  )}
                </div>
              </div>
              <span className="w-24 shrink-0 text-right text-xs font-medium text-slate-700 dark:text-slate-300">
                {valueFormatter(row.value)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // Vertical: bars grow from a shared zero baseline, up for positive values
  // and down for negative ones, so profit and loss both read correctly.
  const maxPositive = Math.max(0, ...rows.map((r) => r.value));
  const maxNegative = Math.max(0, ...rows.map((r) => -r.value));
  const totalRange = maxPositive + maxNegative || 1;
  const topHeight = (maxPositive / totalRange) * CHART_HEIGHT_PX;
  const bottomHeight = CHART_HEIGHT_PX - topHeight;

  return (
    <div className="flex items-stretch gap-4 overflow-x-auto pt-8 pb-1">
      {rows.map((row) => {
        const isHovered = hoverKey === row.key;
        const barHeight =
          row.value >= 0
            ? maxPositive > 0
              ? Math.max(2, (row.value / maxPositive) * topHeight)
              : 0
            : maxNegative > 0
              ? Math.max(2, (-row.value / maxNegative) * bottomHeight)
              : 0;

        return (
          <div key={row.key} className="flex shrink-0 flex-col items-center">
            <div
              className="relative flex w-9 flex-col justify-end"
              style={{ height: CHART_HEIGHT_PX }}
            >
              <div
                className="absolute inset-x-0 border-t border-slate-300 dark:border-slate-700"
                style={{ top: topHeight }}
              />
              <div
                tabIndex={0}
                role="img"
                aria-label={`${row.label}: ${valueFormatter(row.value)}`}
                onMouseEnter={() => setHoverKey(row.key)}
                onMouseLeave={() => setHoverKey(null)}
                onFocus={() => setHoverKey(row.key)}
                onBlur={() => setHoverKey(null)}
                className={
                  "absolute w-full cursor-default outline-none " +
                  (row.value >= 0 ? "rounded-t-[4px]" : "rounded-b-[4px]")
                }
                style={{
                  height: barHeight,
                  top: row.value >= 0 ? topHeight - barHeight : topHeight,
                  backgroundColor: getColor(row.value),
                  filter: isHovered ? "brightness(1.12)" : undefined,
                }}
              >
                {isHovered && (
                  <div
                    className={
                      "pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow-lg " +
                      (row.value >= 0 ? "bottom-full mb-1.5" : "top-full mt-1.5")
                    }
                  >
                    {valueFormatter(row.value)}
                  </div>
                )}
              </div>
            </div>
            <span className="mt-1.5 max-w-[4.5rem] truncate text-center text-[11px] text-slate-500 dark:text-slate-400">
              {row.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
