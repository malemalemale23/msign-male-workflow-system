import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAccess } from "@/lib/dal";
import { translate, type TKey } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getTheme } from "@/lib/theme";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { updateClient } from "@/app/actions/clients";
import { STAGE_LABEL_KEY } from "@/lib/stages";
import { dueBucket, formatDueLabel, DUE_BADGE_CLASS } from "@/lib/due-status";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await getAccess();
  const locale = await getLocale();
  const theme = await getTheme();
  const t = (key: TKey) => translate(locale, key);

  if (!access.can("clients.view")) redirect("/home");

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      jobs: {
        orderBy: { createdAt: "desc" },
        include: { billing: true },
      },
    },
  });
  if (!client) notFound();

  const canEdit = access.can("clients.edit");
  const billableJob = client.jobs.find((j) => j.billing?.invoiceNumber);
  // Billing Statement only has content when something's outstanding,
  // Receipt only when something's been paid - same guard used on the job
  // detail page's print links, so neither one here is a dead end that
  // redirects back with nothing printed.
  const hasOutstanding = client.jobs.some(
    (j) => j.billing?.invoiceNumber && j.billing.paymentStatus !== "PAID"
  );
  const hasPaid = client.jobs.some(
    (j) => j.billing?.invoiceNumber && j.billing.paymentStatus === "PAID"
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppHeader access={access} locale={locale} theme={theme} backHref="/clients" />

      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          {canEdit ? (
            <form action={updateClient.bind(null, client.id)} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  {t("clientFieldNameEn")}
                  <input
                    name="name"
                    required
                    defaultValue={client.name}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  {t("clientFieldNameTh")}
                  <input
                    name="nameTh"
                    defaultValue={client.nameTh ?? ""}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
                <label className="col-span-2 block text-xs text-slate-500 dark:text-slate-400">
                  {t("clientFieldAddress")}
                  <textarea
                    name="address"
                    rows={2}
                    defaultValue={client.address ?? ""}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  {t("clientFieldTaxId")}
                  <input
                    name="taxId"
                    defaultValue={client.taxId ?? ""}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  {t("clientFieldContact")}
                  <input
                    name="contactInfo"
                    defaultValue={client.contactInfo ?? ""}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  {t("clientFieldCreditTerms")}
                  <input
                    type="number"
                    name="creditTermDays"
                    min={0}
                    defaultValue={client.creditTermDays ?? ""}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
              >
                {t("saveClientButton")}
              </button>
            </form>
          ) : (
            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <p><span className="text-slate-500 dark:text-slate-400">{t("clientFieldNameEn")}: </span>{client.name}</p>
              {client.nameTh && (
                <p><span className="text-slate-500 dark:text-slate-400">{t("clientFieldNameTh")}: </span>{client.nameTh}</p>
              )}
              {client.address && (
                <p><span className="text-slate-500 dark:text-slate-400">{t("clientFieldAddress")}: </span>{client.address}</p>
              )}
              {client.taxId && (
                <p><span className="text-slate-500 dark:text-slate-400">{t("clientFieldTaxId")}: </span>{client.taxId}</p>
              )}
              {client.contactInfo && (
                <p><span className="text-slate-500 dark:text-slate-400">{t("clientFieldContact")}: </span>{client.contactInfo}</p>
              )}
              {client.creditTermDays != null && (
                <p>
                  <span className="text-slate-500 dark:text-slate-400">{t("clientFieldCreditTerms")}: </span>
                  {translate(locale, "clientCreditTermsDays", { days: String(client.creditTermDays) })}
                </p>
              )}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t("clientJobHistorySection")}
          </h2>
          {client.jobs.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">{t("clientNoJobsYet")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2">{t("jobCode")}</th>
                    <th className="px-3 py-2">{t("jobName")}</th>
                    <th className="px-3 py-2">{t("stage")}</th>
                    <th className="px-3 py-2">{t("deliveryDue")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {client.jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                        <Link href={`/jobs/${job.id}`} className="hover:underline">
                          {job.jobCode}
                        </Link>
                      </td>
                      <td className="px-3 py-2 dark:text-slate-300">{job.jobName}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className="inline-block whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {STAGE_LABEL_KEY[job.stage] ? translate(locale, STAGE_LABEL_KEY[job.stage]) : job.stage}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {job.stage === "ARCHIVED" ? (
                          <span className="text-slate-400 dark:text-slate-500">-</span>
                        ) : (
                          <span
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
                </tbody>
              </table>
            </div>
          )}
        </section>

        {billableJob && (hasOutstanding || hasPaid) && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("clientBillingSection")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {hasOutstanding && (
                <Link
                  href={`/jobs/${billableJob.id}/billing-statement`}
                  className="inline-block rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {t("viewBillingStatementButton")}
                </Link>
              )}
              {hasPaid && (
                <Link
                  href={`/jobs/${billableJob.id}/receipt`}
                  className="inline-block rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {t("viewReceiptButton")}
                </Link>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
