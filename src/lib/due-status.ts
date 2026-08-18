// Single source of truth for due-date urgency, shared by the stage/due chart
// and the job board table so both use the same buckets and never drift.

import { translate, type Locale } from "@/lib/i18n";

export type DueBucket = "overdue" | "dueToday" | "upcoming";

export const DUE_STATUS_COLOR: Record<DueBucket, string> = {
  overdue: "#d03b3b",
  dueToday: "#fab219",
  upcoming: "#0ca30c",
};

// Same buckets as DUE_STATUS_COLOR, as Tailwind classes for the badge used
// on the Job Board and Client Detail's job history table - was duplicated
// identically in both, moved here so they can't drift apart.
export const DUE_BADGE_CLASS: Record<DueBucket, string> = {
  overdue: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  dueToday: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  upcoming: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function dueBucket(due: Date | null): DueBucket {
  // Every job gets a due date at creation (blank defaults to +14 days), this
  // is just a defensive fallback for any older record without one.
  if (!due) return "upcoming";
  const today = startOfDay(new Date());
  const d = startOfDay(due);
  if (d.getTime() < today.getTime()) return "overdue";
  if (d.getTime() === today.getTime()) return "dueToday";
  return "upcoming";
}

// Finer-grained bucketing for the per-stage charts on the Job Board: same
// overdue/today split as dueBucket, but the next 7 days each get their own
// key instead of being lumped into one "upcoming" bucket, so a chart can
// show one bar per specific date. Beyond 7 days (or no due date at all)
// folds into "later" - unbounded individual-date bars would make a busy
// board unreadable. A held job (see Job.onHold) always buckets to "onHold"
// regardless of its actual date - it's a display override, not a real
// change to urgency, kept as its own bucket so it stays findable rather
// than disappearing.
export function dayBucketKey(
  due: Date | null,
  onHold: boolean,
  referenceDate: Date = new Date()
): string {
  if (onHold) return "onHold";
  if (!due) return "later";
  const today = startOfDay(referenceDate);
  const d = startOfDay(due);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays >= 1 && diffDays <= 7) return `d${diffDays}`;
  return "later";
}

// Day/month, no year - matches this app's short due-date chart labels.
export function dayBucketDateLabel(diffDays: number, referenceDate: Date = new Date()): string {
  const d = startOfDay(referenceDate);
  d.setDate(d.getDate() + diffDays);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// Human-readable urgency, the actual fix for "green hides how many days
// away this is": always states the day count instead of making the reader
// do the math from a calendar date. Localized, this is the only place the
// day-diff gets turned into display text.
export function formatDueLabel(locale: Locale, due: Date | null): string {
  if (!due) return translate(locale, "dueBadgeNoDate");
  const today = startOfDay(new Date());
  const d = startOfDay(due);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) {
    return translate(locale, "dueBadgeOverdueDays", {
      days: String(Math.abs(diffDays)),
    });
  }
  if (diffDays === 0) return translate(locale, "dueBadgeToday");
  if (diffDays === 1) return translate(locale, "dueBadgeTomorrow");
  return translate(locale, "dueBadgeInDays", { days: String(diffDays) });
}
