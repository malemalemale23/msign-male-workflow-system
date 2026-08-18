import { notFound, redirect } from "next/navigation";
import { getAccess } from "@/lib/dal";
import { translate, type TKey } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getTheme } from "@/lib/theme";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { updateMaterial } from "@/app/actions/materials";

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await getAccess();
  const locale = await getLocale();
  const theme = await getTheme();
  const t = (key: TKey) => translate(locale, key);

  if (!access.can("materials.view")) redirect("/home");

  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) notFound();

  const canEdit = access.can("materials.edit");
  const isLowStock =
    material.reorderThreshold != null && material.quantityOnHand <= material.reorderThreshold;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppHeader access={access} locale={locale} theme={theme} backHref="/materials" />

      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          {canEdit ? (
            <form action={updateMaterial.bind(null, material.id)} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  {t("materialFieldNameEn")}
                  <input
                    name="name"
                    required
                    defaultValue={material.name}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  {t("materialFieldNameTh")}
                  <input
                    name="nameTh"
                    defaultValue={material.nameTh ?? ""}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  {t("materialFieldCategory")}
                  <input
                    name="category"
                    defaultValue={material.category ?? ""}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  {t("materialFieldSupplier")}
                  <input
                    name="supplier"
                    defaultValue={material.supplier ?? ""}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  {t("materialFieldUnit")}
                  <input
                    name="unit"
                    defaultValue={material.unit ?? ""}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  {t("materialFieldUnitPrice")}
                  <input
                    type="number"
                    step="0.01"
                    name="unitPrice"
                    defaultValue={material.unitPrice ?? ""}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  {t("materialFieldQuantityOnHand")}
                  <input
                    type="number"
                    step="0.01"
                    name="quantityOnHand"
                    defaultValue={material.quantityOnHand}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  {t("materialFieldReorderThreshold")}
                  <input
                    type="number"
                    step="0.01"
                    name="reorderThreshold"
                    defaultValue={material.reorderThreshold ?? ""}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
                <label className="col-span-2 block text-xs text-slate-500 dark:text-slate-400">
                  {t("materialFieldNotes")}
                  <textarea
                    name="notes"
                    rows={2}
                    defaultValue={material.notes ?? ""}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
              >
                {t("saveMaterialButton")}
              </button>
            </form>
          ) : (
            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <p><span className="text-slate-500 dark:text-slate-400">{t("materialFieldNameEn")}: </span>{material.name}</p>
              {material.nameTh && (
                <p><span className="text-slate-500 dark:text-slate-400">{t("materialFieldNameTh")}: </span>{material.nameTh}</p>
              )}
              {material.category && (
                <p><span className="text-slate-500 dark:text-slate-400">{t("materialFieldCategory")}: </span>{material.category}</p>
              )}
              {material.supplier && (
                <p><span className="text-slate-500 dark:text-slate-400">{t("materialFieldSupplier")}: </span>{material.supplier}</p>
              )}
              {material.unit && (
                <p><span className="text-slate-500 dark:text-slate-400">{t("materialFieldUnit")}: </span>{material.unit}</p>
              )}
              {material.unitPrice != null && (
                <p><span className="text-slate-500 dark:text-slate-400">{t("materialFieldUnitPrice")}: </span>{material.unitPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
              )}
              <p>
                <span className="text-slate-500 dark:text-slate-400">{t("materialFieldQuantityOnHand")}: </span>
                {material.quantityOnHand.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                {isLowStock && (
                  <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                    {t("materialStockLow")}
                  </span>
                )}
              </p>
              {material.reorderThreshold != null && (
                <p><span className="text-slate-500 dark:text-slate-400">{t("materialFieldReorderThreshold")}: </span>{material.reorderThreshold.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
              )}
              {material.notes && (
                <p><span className="text-slate-500 dark:text-slate-400">{t("materialFieldNotes")}: </span>{material.notes}</p>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
