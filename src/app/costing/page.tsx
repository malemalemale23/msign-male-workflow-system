import { redirect } from "next/navigation";
import { getAccess } from "@/lib/dal";
import { translate, type TKey } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getTheme } from "@/lib/theme";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { ReportBarChart, type ReportBarRow } from "@/components/ReportBarChart";
import { clientDisplayName } from "@/lib/client-display";
import { PRODUCT_TYPE_LABEL_KEY } from "@/lib/product-types";

const MAX_CLIENT_BARS = 10;

function money(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

export default async function CostingPage() {
  const access = await getAccess();
  const locale = await getLocale();
  const theme = await getTheme();
  const t = (key: TKey, vars?: Record<string, string>) => translate(locale, key, vars);

  if (!access.can("costing.view")) redirect("/home");

  const [costedJobs, revenueJobs] = await Promise.all([
    prisma.job.findMany({
      where: { actualCost: { actualProfit: { not: null } } },
      include: { actualCost: true },
    }),
    prisma.job.findMany({
      where: { stage: { not: "QUOTATION" } },
      include: { quote: true, client: true },
    }),
  ]);

  // Profit by month, chronological.
  const profitByMonth = new Map<string, number>();
  for (const job of costedJobs) {
    const closedAt = job.actualCost!.closedAt;
    if (!closedAt) continue;
    const key = `${closedAt.getFullYear()}-${String(closedAt.getMonth() + 1).padStart(2, "0")}`;
    profitByMonth.set(key, (profitByMonth.get(key) ?? 0) + job.actualCost!.actualProfit!);
  }
  const profitRows: ReportBarRow[] = Array.from(profitByMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ key, label: monthLabel(key), value }));
  const totalProfit = profitRows.reduce((sum, r) => sum + r.value, 0);

  // Revenue by product type.
  const revenueByType = new Map<string, number>();
  for (const job of revenueJobs) {
    if (!job.quote) continue;
    revenueByType.set(
      job.productType,
      (revenueByType.get(job.productType) ?? 0) + job.quote.quotePrice
    );
  }
  const productRows: ReportBarRow[] = Array.from(revenueByType.entries())
    .map(([key, value]) => ({
      key,
      label: PRODUCT_TYPE_LABEL_KEY[key] ? t(PRODUCT_TYPE_LABEL_KEY[key]) : key,
      value,
    }))
    .sort((a, b) => b.value - a.value);

  // Revenue by client.
  const revenueByClient = new Map<string, { label: string; value: number }>();
  for (const job of revenueJobs) {
    if (!job.quote) continue;
    const existing = revenueByClient.get(job.clientId);
    const label = clientDisplayName(locale, job.client);
    revenueByClient.set(job.clientId, {
      label,
      value: (existing?.value ?? 0) + job.quote.quotePrice,
    });
  }
  const allClientRows = Array.from(revenueByClient.entries())
    .map(([key, { label, value }]) => ({ key, label, value }))
    .sort((a, b) => b.value - a.value);
  const clientRows = allClientRows.slice(0, MAX_CLIENT_BARS);
  const hiddenClientCount = allClientRows.length - clientRows.length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppHeader access={access} locale={locale} theme={theme} backHref="/home" />

      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("costingProfitByMonthSection")}
            </h2>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("costingTotalProfit", { amount: money(totalProfit) })}
            </p>
          </div>
          <ReportBarChart
            rows={profitRows}
            orientation="vertical"
            variant="diverging"
            emptyLabel={t("costingNoData")}
          />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t("costingRevenueByProductSection")}
          </h2>
          <ReportBarChart
            rows={productRows}
            orientation="horizontal"
            emptyLabel={t("costingNoData")}
          />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t("costingRevenueByClientSection")}
          </h2>
          <ReportBarChart
            rows={clientRows}
            orientation="horizontal"
            emptyLabel={t("costingNoData")}
          />
          {hiddenClientCount > 0 && (
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              {t("costingMoreClients", { count: String(hiddenClientCount) })}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
