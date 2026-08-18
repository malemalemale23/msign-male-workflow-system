"use client";

import { useRef, useState } from "react";
import { translate, type TKey, type Locale } from "@/lib/i18n";
import { createJob } from "@/app/actions/jobs";
import { ClientCombobox } from "@/components/ClientCombobox";
import { ProductTypeCombobox } from "@/components/ProductTypeCombobox";

const PREPRESS_OPTIONS: { name: string; labelKey: TKey }[] = [
  { name: "hasDesign", labelKey: "finishDesign" },
  { name: "hasMock", labelKey: "finishMock" },
  { name: "hasPlate", labelKey: "finishPlate" },
];

const POSTPRESS_OPTIONS: { name: string; labelKey: TKey }[] = [
  { name: "hasEmboss", labelKey: "finishEmboss" },
  { name: "hasVarnish", labelKey: "finishVarnish" },
  { name: "hasGlue", labelKey: "finishGlue" },
  { name: "hasDieCut", labelKey: "finishDieCut" },
  { name: "hasHotStamp", labelKey: "finishHotStamp" },
  { name: "hasKCoating", labelKey: "finishKCoating" },
  { name: "hasFolding", labelKey: "finishFolding" },
];

const INPUT_CLASS =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

function isClientFilled(form: HTMLFormElement) {
  const fd = new FormData(form);
  return Boolean(String(fd.get("clientId") ?? "").trim() || String(fd.get("newClientName") ?? "").trim());
}

export function NewJobForm({
  clients,
  locale,
}: {
  clients: { id: string; name: string; nameTh: string | null }[];
  locale: Locale;
}) {
  const t = (key: TKey) => translate(locale, key);
  const formRef = useRef<HTMLFormElement>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [clientMissing, setClientMissing] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const hasClient = isClientFilled(form);
    // noValidate below means the browser never blocks/pops up on its own -
    // checkValidity() still evaluates every required/typed field and drives
    // the :invalid CSS below, just without the native one-at-a-time UI.
    const nativelyValid = form.checkValidity();
    if (!hasClient || !nativelyValid) {
      e.preventDefault();
      setSubmitAttempted(true);
      setClientMissing(!hasClient);
    }
  }

  function recheckClient() {
    if (formRef.current) setClientMissing(!isClientFilled(formRef.current));
  }

  return (
    <form
      ref={formRef}
      action={createJob}
      onSubmit={handleSubmit}
      noValidate
      className={"space-y-6" + (submitAttempted ? " validate-on-submit" : "")}
    >
      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("client")}</h2>
        <ClientCombobox
          clients={clients}
          locale={locale}
          invalid={submitAttempted && clientMissing}
          onStateChange={recheckClient}
        />
        {submitAttempted && clientMissing && (
          <p className="text-xs text-red-600 dark:text-red-400">{t("newJobMissingClientError")}</p>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {t("jobSpecSection")}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="col-span-2 text-xs text-slate-500 dark:text-slate-400">
            {t("jobNameLabel")}
            <input name="jobName" required className={INPUT_CLASS} />
          </label>
          <label className="col-span-2 text-xs text-slate-500 dark:text-slate-400">
            {t("jobShortNameLabel")}
            <input
              name="shortName"
              placeholder={t("jobShortNamePlaceholder")}
              className={INPUT_CLASS}
            />
          </label>
          <ProductTypeCombobox locale={locale} />
          <label className="text-xs text-slate-500 dark:text-slate-400">
            {t("quantityLabel")}
            <input
              type="number"
              name="quantity"
              required
              min={1}
              placeholder={t("quantityPlaceholder")}
              className={INPUT_CLASS + " no-spinner"}
            />
          </label>
          <label className="text-xs text-slate-500 dark:text-slate-400">
            {t("paperTypeLabel")}
            <input name="paperType" className={INPUT_CLASS} />
          </label>
          <label className="text-xs text-slate-500 dark:text-slate-400">
            {t("paperWeightLabel")}
            <input
              name="paperWeight"
              placeholder={t("paperWeightPlaceholder")}
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-xs text-slate-500 dark:text-slate-400">
            {t("paperSizeLabel")}
            <input name="paperSize" className={INPUT_CLASS} />
          </label>
          <label className="text-xs text-slate-500 dark:text-slate-400">
            {t("requestedDeliveryDate")}
            <input type="date" name="deliveryDueDate" className={INPUT_CLASS} />
          </label>
        </div>

        <div className="pt-2">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {t("prepressSection")}
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-700 dark:text-slate-300">
            {PREPRESS_OPTIONS.map(({ name, labelKey }) => (
              <label key={name} className="flex items-center gap-1.5">
                <input type="checkbox" name={name} /> {t(labelKey)}
              </label>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {t("postpressSection")}
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-700 dark:text-slate-300">
            {POSTPRESS_OPTIONS.map(({ name, labelKey }) => (
              <label key={name} className="flex items-center gap-1.5">
                <input type="checkbox" name={name} /> {t(labelKey)}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {t("clientPOSection")}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-500 dark:text-slate-400">
            {t("poNumberLabel")}
            <input name="poNumber" className={INPUT_CLASS} />
          </label>
          <label className="text-xs text-slate-500 dark:text-slate-400">
            {t("poDateLabel")}
            <input type="date" name="poDate" className={INPUT_CLASS} />
          </label>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/40">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {t("costPriceSection")}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="text-xs text-slate-500 dark:text-slate-400">
            {t("estDMLabel")}
            <input type="number" step="0.01" name="estimatedDM" className={INPUT_CLASS} />
          </label>
          <label className="text-xs text-slate-500 dark:text-slate-400">
            {t("estDLLabel")}
            <input type="number" step="0.01" name="estimatedDL" className={INPUT_CLASS} />
          </label>
          <label className="text-xs text-slate-500 dark:text-slate-400">
            {t("estMOHLabel")}
            <input type="number" step="0.01" name="estimatedMOH" className={INPUT_CLASS} />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            {t("quotePriceLabel")}
            <input type="number" step="0.01" name="quotePrice" required className={INPUT_CLASS} />
          </label>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            {t("vatPercentLabel")}
            <input
              type="number"
              step="0.01"
              name="vatRate"
              defaultValue={7}
              placeholder={t("vatExemptPlaceholder")}
              className={INPUT_CLASS}
            />
          </label>
        </div>
      </section>

      <button
        type="submit"
        className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
      >
        {t("createJobButton")}
      </button>
    </form>
  );
}
