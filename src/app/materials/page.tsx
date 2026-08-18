import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccess } from "@/lib/dal";
import { translate } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getTheme } from "@/lib/theme";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import type { Locale } from "@/lib/i18n";

function materialDisplayName(locale: Locale, material: { name: string; nameTh: string | null }) {
  if (locale === "th" && material.nameTh) return material.nameTh;
  return material.name;
}

function isLowStock(material: { quantityOnHand: number; reorderThreshold: number | null }) {
  return material.reorderThreshold != null && material.quantityOnHand <= material.reorderThreshold;
}

export default async function MaterialsPage() {
  const access = await getAccess();
  const locale = await getLocale();
  const theme = await getTheme();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  if (!access.can("materials.view")) redirect("/home");

  const materials = await prisma.material.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppHeader access={access} locale={locale} theme={theme} backHref="/home" />

      <main className="p-6">
        {access.can("materials.edit") && (
          <div className="mb-4 flex justify-end">
            <Link
              href="/materials/new"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              {t("newMaterialButton")}
            </Link>
          </div>
        )}
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">{t("clientColName")}</th>
                <th className="px-4 py-3">{t("materialFieldCategory")}</th>
                <th className="px-4 py-3">{t("materialFieldSupplier")}</th>
                <th className="px-4 py-3">{t("materialFieldUnit")}</th>
                <th className="px-4 py-3 text-right">{t("materialFieldUnitPrice")}</th>
                <th className="px-4 py-3 text-right">{t("materialColStock")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {materials.map((material) => (
                <tr key={material.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    <Link href={`/materials/${material.id}`} className="hover:underline">
                      {materialDisplayName(locale, material)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 dark:text-slate-300">{material.category || "-"}</td>
                  <td className="px-4 py-3 dark:text-slate-300">{material.supplier || "-"}</td>
                  <td className="px-4 py-3 dark:text-slate-300">{material.unit || "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right dark:text-slate-300">
                    {material.unitPrice != null ? material.unitPrice.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <span className="dark:text-slate-300">
                      {material.quantityOnHand.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </span>
                    {isLowStock(material) && (
                      <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        {t("materialStockLow")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {materials.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    {t("materialsListEmpty")}
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
