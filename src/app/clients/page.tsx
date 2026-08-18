import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccess } from "@/lib/dal";
import { translate } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getTheme } from "@/lib/theme";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { clientDisplayName } from "@/lib/client-display";

export default async function ClientsPage() {
  const access = await getAccess();
  const locale = await getLocale();
  const theme = await getTheme();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  if (!access.can("clients.view")) redirect("/home");

  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { jobs: { where: { stage: { not: "ARCHIVED" } } } },
      },
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppHeader access={access} locale={locale} theme={theme} backHref="/home" />

      <main className="p-6">
        {access.can("clients.edit") && (
          <div className="mb-4 flex justify-end">
            <Link
              href="/clients/new"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              {t("newClientButton")}
            </Link>
          </div>
        )}
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">{t("clientColName")}</th>
                <th className="px-4 py-3">{t("clientColContact")}</th>
                <th className="px-4 py-3">{t("clientColTaxId")}</th>
                <th className="px-4 py-3">{t("clientColCredit")}</th>
                <th className="px-4 py-3 text-right">{t("clientColOpenJobs")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    <Link href={`/clients/${client.id}`} className="hover:underline">
                      {clientDisplayName(locale, client)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 dark:text-slate-300">
                    {client.contactInfo || "-"}
                  </td>
                  <td className="px-4 py-3 dark:text-slate-300">
                    {client.taxId || "-"}
                  </td>
                  <td className="px-4 py-3 dark:text-slate-300">
                    {client.creditTermDays != null
                      ? translate(locale, "clientCreditTermsDays", {
                          days: String(client.creditTermDays),
                        })
                      : "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right dark:text-slate-300">
                    {client._count.jobs}
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    {t("clientsListEmpty")}
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
