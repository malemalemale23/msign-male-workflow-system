import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAccess } from "@/lib/dal";
import { getLocale } from "@/lib/locale";
import { getTheme } from "@/lib/theme";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { StageBreadcrumb } from "@/components/StageBreadcrumb";
import { STAGE_LABEL_KEY } from "@/lib/stages";
import { PRODUCT_TYPE_LABEL_KEY } from "@/lib/product-types";
import { clientDisplayName } from "@/lib/client-display";
import { roleDisplayName } from "@/lib/role-display";
import { translate, type TKey, type Locale } from "@/lib/i18n";
import {
  confirmPO,
  updateSaleOrder,
  updateJobSpec,
  toggleProductionStep,
  advanceToQC,
  submitQC,
  updateDeliveryInstructions,
  recordDelivery,
  updateBilling,
  saveActualCost,
  setJobHold,
} from "@/app/actions/jobs";
import type { PrintDocumentType } from "@/generated/prisma/client";

const PRINT_DOCUMENT_LABEL_KEY: Record<PrintDocumentType, TKey> = {
  QUOTATION: "docQuotation",
  SALE_ORDER: "docSaleOrder",
  TAX_INVOICE: "docTaxInvoice",
  BILLING_STATEMENT: "docBillingStatement",
  RECEIPT: "docReceipt",
};

function money(n: number | null | undefined) {
  if (n == null) return "-";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
function dateInput(d: Date | null | undefined) {
  return d ? d.toISOString().slice(0, 10) : "";
}
function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function formatDateTime(d: Date) {
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

const FINISH_LABEL_KEY: Record<
  | "hasDesign"
  | "hasMock"
  | "hasPlate"
  | "hasEmboss"
  | "hasVarnish"
  | "hasGlue"
  | "hasDieCut"
  | "hasHotStamp"
  | "hasKCoating"
  | "hasFolding",
  TKey
> = {
  hasDesign: "finishDesign",
  hasMock: "finishMock",
  hasPlate: "finishPlate",
  hasEmboss: "finishEmboss",
  hasVarnish: "finishVarnish",
  hasGlue: "finishGlue",
  hasDieCut: "finishDieCut",
  hasHotStamp: "finishHotStamp",
  hasKCoating: "finishKCoating",
  hasFolding: "finishFolding",
};

// Activity log's STEP_COMPLETED/STEP_REOPENED detail stores the *Done
// field name (e.g. "glueDone"), not the has* flag - separate map, same
// underlying labels as FINISH_LABEL_KEY.
const STEP_DONE_LABEL_KEY: Record<string, TKey> = {
  designDone: "finishDesign",
  mockDone: "finishMock",
  plateDone: "finishPlate",
  printDone: "finishPrint",
  embossDone: "finishEmboss",
  varnishDone: "finishVarnish",
  glueDone: "finishGlue",
  dieCutDone: "finishDieCut",
  hotStampDone: "finishHotStamp",
  kCoatingDone: "finishKCoating",
  foldingDone: "finishFolding",
};

type VisibilityRole = { id: string; name: string; nameTh: string | null; color: string };

// Right-aligned next to whichever price/cost line it belongs to, per
// direct feedback. Wraps onto multiple lines rather than truncating -
// deliberately not assuming a small, fixed number of roles, since this
// needs to keep working if this app is ever sold to a company with a much
// larger headcount and role list than M Sign's own ~4 staff.
function VisibleToBadges({
  label,
  roles,
  locale,
}: {
  label: string;
  roles: VisibilityRole[];
  locale: Locale;
}) {
  if (roles.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-end gap-1 text-[11px] text-slate-400 dark:text-slate-500">
      <span className="mr-0.5">{label}</span>
      {roles.map((role) => (
        <span
          key={role.id}
          className="inline-block whitespace-nowrap rounded-full px-1.5 py-0.5 font-medium text-white"
          style={{ backgroundColor: role.color }}
        >
          {roleDisplayName(locale, role)}
        </span>
      ))}
    </div>
  );
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await getAccess();
  const locale = await getLocale();
  const theme = await getTheme();
  const t = (key: TKey, vars?: Record<string, string>) => translate(locale, key, vars);

  if (!access.can("jobs.view")) redirect("/home");

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      client: true,
      quote: true,
      actualCost: true,
      billing: true,
      deliveries: { orderBy: { deliveredAt: "desc" } },
      printLogs: { orderBy: { printedAt: "desc" }, include: { printedBy: true } },
      activityLogs: { orderBy: { createdAt: "desc" }, include: { actor: true } },
    },
  });
  if (!job) notFound();

  const canPrice = access.can("jobs.view_price");
  const canCost = access.can("jobs.view_cost");
  const canProd = access.can("jobs.view_production");
  const canEditProd = access.can("jobs.edit_production");
  const canEditLogistics = access.can("jobs.edit_logistics");
  // Settings managers can see WHO has price/cost visibility even if they
  // don't personally have it themselves - oversight without being granted
  // the sensitive figures directly. Matches direct user feedback: "the one
  // who can [see] it should be able to see it, however an admin/moderator
  // is like top of everything to oversee."
  const canSeeVisibilityInfo = access.can("settings.manage");

  const [priceVisibleRoles, costVisibleRoles] =
    job.quote && (canPrice || canCost || canSeeVisibilityInfo)
      ? await Promise.all([
          prisma.role.findMany({
            where: { permissions: { some: { key: "jobs.view_price" } } },
            select: { id: true, name: true, nameTh: true, color: true },
          }),
          prisma.role.findMany({
            where: { permissions: { some: { key: "jobs.view_cost" } } },
            select: { id: true, name: true, nameTh: true, color: true },
          }),
        ])
      : [[], []];

  // Billing Statement only has content when the client has something
  // outstanding, Receipt only when something's been paid - showing both
  // buttons unconditionally meant one (or both) could be a dead end that
  // just redirects back here with nothing printed.
  const [hasOutstandingForClient, hasPaidForClient] =
    canPrice && job.billing?.invoiceNumber
      ? await Promise.all([
          prisma.job.count({
            where: {
              clientId: job.clientId,
              billing: { invoiceNumber: { not: null }, paymentStatus: { not: "PAID" } },
            },
          }),
          prisma.job.count({
            where: {
              clientId: job.clientId,
              billing: { invoiceNumber: { not: null }, paymentStatus: "PAID" },
            },
          }),
        ])
      : [0, 0];

  type ProductionStep = {
    key:
      | "designDone"
      | "mockDone"
      | "plateDone"
      | "printDone"
      | "embossDone"
      | "varnishDone"
      | "glueDone"
      | "dieCutDone"
      | "hotStampDone"
      | "kCoatingDone"
      | "foldingDone";
    label: string;
    required: boolean;
    done: boolean;
  };
  // Fixed pipeline order: prepress -> printing (always required) -> postpress.
  // Order is informational only, not enforced - any step can be toggled
  // regardless of whether earlier steps are done.
  const prepressAll: ProductionStep[] = [
    { key: "designDone", label: t(FINISH_LABEL_KEY.hasDesign), required: job.hasDesign, done: job.designDone },
    { key: "mockDone", label: t(FINISH_LABEL_KEY.hasMock), required: job.hasMock, done: job.mockDone },
    { key: "plateDone", label: t(FINISH_LABEL_KEY.hasPlate), required: job.hasPlate, done: job.plateDone },
  ];
  const printingAll: ProductionStep[] = [
    { key: "printDone", label: t("finishPrint"), required: true, done: job.printDone },
  ];
  const postpressAll: ProductionStep[] = [
    { key: "embossDone", label: t(FINISH_LABEL_KEY.hasEmboss), required: job.hasEmboss, done: job.embossDone },
    { key: "varnishDone", label: t(FINISH_LABEL_KEY.hasVarnish), required: job.hasVarnish, done: job.varnishDone },
    { key: "glueDone", label: t(FINISH_LABEL_KEY.hasGlue), required: job.hasGlue, done: job.glueDone },
    { key: "dieCutDone", label: t(FINISH_LABEL_KEY.hasDieCut), required: job.hasDieCut, done: job.dieCutDone },
    { key: "hotStampDone", label: t(FINISH_LABEL_KEY.hasHotStamp), required: job.hasHotStamp, done: job.hotStampDone },
    { key: "kCoatingDone", label: t(FINISH_LABEL_KEY.hasKCoating), required: job.hasKCoating, done: job.kCoatingDone },
    { key: "foldingDone", label: t(FINISH_LABEL_KEY.hasFolding), required: job.hasFolding, done: job.foldingDone },
  ];
  const prepressSteps = prepressAll.filter((s) => s.required);
  const printingSteps = printingAll.filter((s) => s.required);
  const postpressSteps = postpressAll.filter((s) => s.required);
  const allStepsDone = [...prepressSteps, ...printingSteps, ...postpressSteps].every((s) => s.done);

  const finishingStepsText = [
    job.hasDesign && t(FINISH_LABEL_KEY.hasDesign),
    job.hasMock && t(FINISH_LABEL_KEY.hasMock),
    job.hasPlate && t(FINISH_LABEL_KEY.hasPlate),
    job.hasEmboss && t(FINISH_LABEL_KEY.hasEmboss),
    job.hasVarnish && t(FINISH_LABEL_KEY.hasVarnish),
    job.hasGlue && t(FINISH_LABEL_KEY.hasGlue),
    job.hasDieCut && t(FINISH_LABEL_KEY.hasDieCut),
    job.hasHotStamp && t(FINISH_LABEL_KEY.hasHotStamp),
    job.hasKCoating && t(FINISH_LABEL_KEY.hasKCoating),
    job.hasFolding && t(FINISH_LABEL_KEY.hasFolding),
  ]
    .filter(Boolean)
    .join(", ") || t("noFinishingSteps");

  const deliveredSoFar = job.deliveries.reduce((sum, d) => sum + d.quantity, 0);
  const remainingToDeliver = job.quantity - deliveredSoFar;

  const activityEntries = job.activityLogs.map((log) => {
    let text: string;
    if (log.type === "STAGE_CHANGE") {
      const stageLabel = STAGE_LABEL_KEY[log.detail]
        ? translate(locale, STAGE_LABEL_KEY[log.detail])
        : log.detail;
      text = t("activityStageChange", { stage: stageLabel });
    } else {
      const stepLabel = STEP_DONE_LABEL_KEY[log.detail]
        ? t(STEP_DONE_LABEL_KEY[log.detail])
        : log.detail;
      text = t(
        log.type === "STEP_COMPLETED" ? "activityStepCompleted" : "activityStepReopened",
        { step: stepLabel }
      );
    }
    return { id: log.id, text, actorName: log.actor.name, createdAt: log.createdAt };
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppHeader access={access} locale={locale} theme={theme} backHref="/jobs" />

      <main className="mx-auto max-w-5xl p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {job.jobCode} &middot; {job.jobName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {clientDisplayName(locale, job.client)} &middot;{" "}
            {t(PRODUCT_TYPE_LABEL_KEY[job.productType])} &middot;{" "}
            {job.quantity.toLocaleString()} {t("pcsSuffix")}
          </p>
        </div>

        <StageBreadcrumb stage={job.stage} locale={locale} />

        {canProd && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("specSection")}
            </h2>
            {canEditProd ? (
              <form action={updateJobSpec.bind(null, job.id)} className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    {t("paperTypeLabel")}
                    <input
                      name="paperType"
                      defaultValue={job.paperType ?? ""}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </label>
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    {t("paperWeightLabel")}
                    <input
                      name="paperWeight"
                      defaultValue={job.paperWeight ?? ""}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </label>
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    {t("paperSizeLabel")}
                    <input
                      name="paperSize"
                      defaultValue={job.paperSize ?? ""}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                  {(Object.keys(FINISH_LABEL_KEY) as (keyof typeof FINISH_LABEL_KEY)[]).map((key) => (
                    <label key={key} className="flex items-center gap-1.5">
                      <input type="checkbox" name={key} defaultChecked={job[key]} />
                      {t(FINISH_LABEL_KEY[key])}
                    </label>
                  ))}
                </div>
                <button className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300">
                  {t("saveButton")}
                </button>
              </form>
            ) : (
              <>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {[job.paperType, job.paperWeight, job.paperSize].filter(Boolean).join(" / ") || "-"}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {finishingStepsText}
                </p>
              </>
            )}
          </section>
        )}

        {(canPrice || canCost || canSeeVisibilityInfo) && job.quote && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("stageQuotation")}
            </h2>
            {(canPrice || canSeeVisibilityInfo) && (
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                {canPrice ? (
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {t("quotePriceColon")}{" "}
                    <span className="font-medium">{money(job.quote.quotePrice)}</span>
                  </p>
                ) : (
                  <span />
                )}
                <VisibleToBadges label={t("canBeSeenByLabel")} roles={priceVisibleRoles} locale={locale} />
              </div>
            )}
            {(canCost || canSeeVisibilityInfo) && (
              <div className="mt-1 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                {canCost ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("estDMDLMOHColon")} {money(job.quote.estimatedDM)} / {money(job.quote.estimatedDL)} /{" "}
                    {money(job.quote.estimatedMOH)}
                  </p>
                ) : (
                  <span />
                )}
                <VisibleToBadges label={t("canBeSeenByLabel")} roles={costVisibleRoles} locale={locale} />
              </div>
            )}
            {canPrice && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/jobs/${job.id}/quotation`}
                  className="inline-block rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {t("printQuotationButton")}
                </Link>
                {job.poNumber && (
                  <Link
                    href={`/jobs/${job.id}/sale-order`}
                    className="inline-block rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {t("printSaleOrderButton")}
                  </Link>
                )}
              </div>
            )}
          </section>
        )}

        {job.stage === "QUOTATION" && canEditLogistics && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("confirmPOSection")}
            </h2>
            <form action={confirmPO.bind(null, job.id)} className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-slate-500 dark:text-slate-400">
                {t("poNumberLabel")}
                <input
                  name="poNumber"
                  defaultValue={job.poNumber ?? ""}
                  placeholder={t("clientPONumberPlaceholder")}
                  className="mt-1 block rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="text-xs text-slate-500 dark:text-slate-400">
                {t("poDateLabel")}
                <input
                  type="date"
                  name="poDate"
                  defaultValue={dateInput(job.poDate)}
                  className="mt-1 block rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <button className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300">
                {t("confirmPOButton")}
              </button>
            </form>
          </section>
        )}

        {(job.stage === "PURCHASE_ORDER" || job.stage === "SALE_ORDER") && canEditLogistics && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("orderMaterialsSection")}
              </h2>
              {access.can("materials.view") && (
                <Link
                  href="/materials"
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {t("viewStockButton")}
                </Link>
              )}
            </div>
            <form action={updateSaleOrder.bind(null, job.id)} className="space-y-3">
              <label className="block text-xs text-slate-500 dark:text-slate-400">
                {t("paperInkSupplierLabel")}
                <input
                  name="paperSupplier"
                  defaultValue={job.paperSupplier ?? ""}
                  placeholder={t("paperInkSupplierLabel")}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" name="materialsReady" defaultChecked={job.materialsReady} />
                {t("materialsReadyCheckbox")}
              </label>
              <button className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300">
                {t("saveButton")}
              </button>
            </form>
          </section>
        )}

        {(job.stage === "PRODUCTION" || job.stage === "QC") && canProd && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("productionSection")}
            </h2>
            {(
              [
                { labelKey: "prepressSection", steps: prepressSteps },
                { labelKey: "printingSection", steps: printingSteps },
                { labelKey: "postpressSection", steps: postpressSteps },
              ] as const
            ).map(
              (group) =>
                group.steps.length > 0 && (
                  <div key={group.labelKey} className="mb-4 last:mb-0">
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {t(group.labelKey)}
                    </p>
                    <div className="space-y-2">
                      {group.steps.map((step) => (
                        <form
                          key={step.key}
                          action={toggleProductionStep.bind(null, job.id, step.key, !step.done)}
                        >
                          <button
                            type="submit"
                            disabled={!canEditProd}
                            className={
                              "flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm " +
                              (step.done
                                ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                                : "border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800")
                            }
                          >
                            <span>{step.label}</span>
                            <span>{step.done ? t("doneLabel") : t("markDoneButton")}</span>
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>
                )
            )}

            {job.stage === "PRODUCTION" && canEditProd && (
              <form action={advanceToQC.bind(null, job.id)} className="mt-3">
                <button className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
                  {t("sendToQCButton")}
                </button>
                {/* Informational only, not blocking: floor staff sometimes
                    need to send a job to QC before every step is literally
                    checked off in the system. */}
                {!allStepsDone && (
                  <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                    {t("sendToQCStepsRemaining")}
                  </p>
                )}
              </form>
            )}

            {job.stage === "QC" && canEditProd && (
              <form action={submitQC.bind(null, job.id)} className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  {t("qcNoteLabel")}
                  <input
                    name="qcNote"
                    placeholder={t("qcNoteOptionalPlaceholder")}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    name="result"
                    value="pass"
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    {t("qcPassButton")}
                  </button>
                  <button
                    name="result"
                    value="fail"
                    className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                  >
                    {t("qcFailButton")}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        {canEditLogistics && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("deliveryInstructionsSection")}
            </h2>
            <form action={updateDeliveryInstructions.bind(null, job.id)} className="space-y-2">
              <textarea
                name="deliveryInstructions"
                rows={2}
                defaultValue={job.deliveryInstructions ?? ""}
                placeholder={t("deliveryInstructionsPlaceholder")}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <button className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300">
                {t("saveButton")}
              </button>
            </form>
          </section>
        )}

        {/* On-hold specifically means "client asked us to hold the
            finished product, don't ship it yet" - only makes sense once
            there's finished stock sitting here waiting to go out, i.e.
            the Delivery stage. Not a general pause-anything-anytime flag. */}
        {job.stage === "DELIVERY" && (
          <section
            className={
              "rounded-lg border p-4 " +
              (job.onHold
                ? "border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900")
            }
          >
            {canEditLogistics ? (
              <form action={setJobHold.bind(null, job.id)} className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <input type="checkbox" name="onHold" defaultChecked={job.onHold} />
                  {t("onHoldCheckbox")}
                </label>
                <input
                  name="holdReason"
                  defaultValue={job.holdReason ?? ""}
                  placeholder={t("holdReasonPlaceholder")}
                  className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <button className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300">
                  {t("saveButton")}
                </button>
              </form>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {job.onHold
                  ? `${t("onHoldStatusText")}${job.holdReason ? ` (${job.holdReason})` : ""}`
                  : t("notOnHoldStatusText")}
              </p>
            )}
          </section>
        )}

        {job.stage === "DELIVERY" && canEditLogistics && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("stageDelivery")}
            </h2>

            <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">
              {t("deliveredSoFarSummary", {
                delivered: deliveredSoFar.toLocaleString(),
                total: job.quantity.toLocaleString(),
                remaining: remainingToDeliver.toLocaleString(),
              })}
            </p>

            {job.deliveries.length > 0 && (
              <div className="mb-4 space-y-1 border-b border-slate-100 pb-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                {job.deliveries.map((d) => (
                  <p key={d.id}>
                    {formatDate(d.deliveredAt)} &middot; {d.quantity.toLocaleString()} {t("pcsSuffix")}
                    {d.notes && <> &middot; {d.notes}</>}
                  </p>
                ))}
              </div>
            )}

            <form action={recordDelivery.bind(null, job.id)} className="space-y-3">
              <label className="block text-xs text-slate-500 dark:text-slate-400">
                {t("deliveryQuantityLabel")}
                <input
                  type="number"
                  name="quantity"
                  min={1}
                  max={remainingToDeliver}
                  defaultValue={remainingToDeliver}
                  required
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="block text-xs text-slate-500 dark:text-slate-400">
                {t("deliveryNotesLabel")}
                <input
                  name="notes"
                  placeholder={t("deliveryNotesOptionalPlaceholder")}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <button className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300">
                {t("recordDeliveryButton")}
              </button>
            </form>
          </section>
        )}

        {(job.stage === "BILLING" || job.stage === "ARCHIVED") && canEditLogistics && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("stageBilling")}
            </h2>
            <form action={updateBilling.bind(null, job.id)} className="grid grid-cols-2 gap-3">
              <label className="text-xs text-slate-500 dark:text-slate-400">
                {t("invoiceNumberLabel")}
                <input
                  name="invoiceNumber"
                  defaultValue={job.billing?.invoiceNumber ?? ""}
                  placeholder={t("invoiceNumberLabel")}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="text-xs text-slate-500 dark:text-slate-400">
                {t("amountDueLabel")}
                <input
                  type="number"
                  step="0.01"
                  name="amountDue"
                  defaultValue={job.billing?.amountDue ?? ""}
                  placeholder={t("amountDueLabel")}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="text-xs text-slate-500 dark:text-slate-400">
                {t("paymentDueDateLabel")}
                <input
                  type="date"
                  name="paymentDueDate"
                  defaultValue={dateInput(job.billing?.paymentDueDate)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="col-span-2 text-xs text-slate-500 dark:text-slate-400">
                {t("paymentStatusLabel")}
                <select
                  name="paymentStatus"
                  defaultValue={job.billing?.paymentStatus ?? "PENDING"}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="PENDING">{t("paymentPending")}</option>
                  <option value="PARTIAL">{t("paymentPartial")}</option>
                  <option value="PAID">{t("paymentPaid")}</option>
                </select>
              </label>
              <label className="col-span-2 text-xs text-slate-500 dark:text-slate-400">
                {t("billingNotesLabel")}
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={job.billing?.notes ?? ""}
                  placeholder={t("billingNotesPlaceholder")}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <button className="col-span-2 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300">
                {t("saveButton")}
              </button>
            </form>
            {canPrice && job.billing?.invoiceNumber && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/jobs/${job.id}/tax-invoice`}
                  className="inline-block rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {t("printTaxInvoiceButton")}
                </Link>
                {hasOutstandingForClient > 0 && (
                  <Link
                    href={`/jobs/${job.id}/billing-statement`}
                    className="inline-block rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {t("printBillingStatementButton")}
                  </Link>
                )}
                {hasPaidForClient > 0 && (
                  <Link
                    href={`/jobs/${job.id}/receipt`}
                    className="inline-block rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {t("printReceiptButton")}
                  </Link>
                )}
              </div>
            )}
          </section>
        )}

        {canCost && (job.stage === "BILLING" || job.stage === "ARCHIVED") && (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/40">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("actualCostProfitSection")}
            </h2>
            <form action={saveActualCost.bind(null, job.id)} className="grid grid-cols-3 gap-3">
              <label className="text-xs text-slate-500 dark:text-slate-400">
                {t("actualDMLabel")}
                <input
                  type="number"
                  step="0.01"
                  name="actualDM"
                  defaultValue={job.actualCost?.actualDM ?? ""}
                  placeholder={t("actualDMLabel")}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="text-xs text-slate-500 dark:text-slate-400">
                {t("actualDLLabel")}
                <input
                  type="number"
                  step="0.01"
                  name="actualDL"
                  defaultValue={job.actualCost?.actualDL ?? ""}
                  placeholder={t("actualDLLabel")}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="text-xs text-slate-500 dark:text-slate-400">
                {t("actualMOHLabel")}
                <input
                  type="number"
                  step="0.01"
                  name="actualMOH"
                  defaultValue={job.actualCost?.actualMOH ?? ""}
                  placeholder={t("actualMOHLabel")}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <button className="col-span-3 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300">
                {t("saveActualCostButton")}
              </button>
            </form>
            {job.actualCost?.actualProfit != null && (
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                {t("actualProfitColon")} <span className="font-medium">{money(job.actualCost.actualProfit)}</span>
              </p>
            )}
          </section>
        )}

        {canPrice && job.printLogs.length > 0 && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("printHistorySection")}
            </h2>
            <ul className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
              {job.printLogs.map((log) => (
                <li key={log.id}>
                  {t(PRINT_DOCUMENT_LABEL_KEY[log.documentType])} &middot; {log.printedBy.name} &middot;{" "}
                  {formatDateTime(log.printedAt)}
                </li>
              ))}
            </ul>
          </section>
        )}
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-6 lg:self-start">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t("activityLogSection")}
          </h2>
          {activityEntries.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">{t("activityLogEmpty")}</p>
          ) : (
            <ul className="space-y-3 text-xs text-slate-500 dark:text-slate-400">
              {activityEntries.map((entry) => (
                <li key={entry.id}>
                  <p className="text-slate-700 dark:text-slate-300">{entry.text}</p>
                  <p>
                    {entry.actorName} &middot; {formatDateTime(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </aside>
        </div>
      </main>
    </div>
  );
}
