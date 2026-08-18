import { STAGE_ORDER, STAGE_LABEL_KEY } from "@/lib/stages";
import { translate, type Locale } from "@/lib/i18n";

export function StageBreadcrumb({
  stage,
  locale,
}: {
  stage: string;
  locale: Locale;
}) {
  const STAGES = STAGE_ORDER;
  const currentIndex = STAGES.findIndex((s) => s.key === stage);

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto rounded-lg border border-slate-200 bg-white px-2 py-3 sm:px-4 dark:border-slate-800 dark:bg-slate-900">
      {STAGES.map((s, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        const label = translate(locale, STAGE_LABEL_KEY[s.key]);
        return (
          <div key={s.key} className="flex shrink-0 items-center">
            <div
              title={label}
              className={
                "flex shrink-0 items-center gap-1 rounded-full px-1.5 py-1 text-[11px] font-medium sm:px-2.5 sm:text-xs " +
                (isCurrent
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : isDone
                    ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    : "text-slate-300 dark:text-slate-600")
              }
            >
              {isDone && <span className="shrink-0">✓</span>}
              <span className="whitespace-nowrap">{label}</span>
            </div>
            {i < STAGES.length - 1 && (
              <span className="mx-0.5 shrink-0 text-slate-200 sm:mx-1 dark:text-slate-700">
                &rarr;
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
