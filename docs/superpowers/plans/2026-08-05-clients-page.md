# Clients Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Clients list, create, and detail pages, wiring them to the already-existing `createClient`/`updateClient` server actions and `clients.view`/`clients.edit` permissions.

**Architecture:** Three new Next.js App Router pages (`/clients`, `/clients/new`, `/clients/[id]`) under `src/app/clients/`, following the exact structural pattern of the existing `src/app/jobs/` pages: server components that call `getAccess()`/`getLocale()`/`getTheme()`, query Prisma directly, and render forms whose `action` prop points at existing server actions.

**Tech Stack:** Next.js 16 (App Router, webpack), React 19 server components, Prisma 7 (SQLite), Tailwind v4. No test framework in this project: verification is `npm run lint`, `npx tsc --noEmit`, and manual browser walkthroughs.

## Global Constraints

- `next dev`/`next build` must run with `--webpack` (already set in `package.json` scripts): do not remove that flag.
- After any `prisma/schema.prisma` change, run `npx prisma migrate dev` then `npx prisma generate` then restart the dev server. (Not expected to apply in this plan: no schema changes.)
- Never rewrite files via PowerShell `Get-Content`/`Set-Content` (mangles Thai text). Use Write/Edit tools only.
- All UI text must go through `src/lib/i18n.ts`'s `translate()`: no hardcoded English/Thai strings in JSX.
- Follow the existing Tailwind class patterns exactly (see reference files below) so the new pages are visually indistinguishable from `/jobs`.
- Demo login for manual verification: `admin`/`admin123` (has `isSuperAdmin`, bypasses all permission checks).

## Reference files (read, do not modify unless stated)

- `src/lib/dal.ts`: `getAccess()`, `requirePermission()`
- `src/lib/permissions.ts`: `clients.view`, `clients.edit` already defined
- `src/lib/client-display.ts`: `clientDisplayName(locale, client)`
- `src/lib/stages.ts`: `STAGE_ORDER`, `STAGE_LABEL_KEY`
- `src/lib/due-status.ts`: `dueBucket()`, `formatDueLabel()`
- `src/app/actions/clients.ts`: `createClient(formData)`, `updateClient(clientId, formData)` (already implemented, do not modify)
- `src/app/jobs/page.tsx`: list page pattern (table, badges, `DUE_BADGE_CLASS`)
- `src/app/jobs/new/page.tsx`: new-item form pattern
- `src/app/jobs/[id]/page.tsx`: detail page pattern (sections, `.bind(null, id)` on form actions)
- `src/components/AppHeader.tsx`: props: `{ access, locale, theme, backHref? }`

---

### Task 1: i18n keys and home page tile

**Files:**
- Modify: `src/lib/i18n.ts` (append inside the `dict` object, right after the existing `saveClientButton` entry at line 330, before the closing `} as const;`)
- Modify: `src/app/home/page.tsx:44-48` (the `tileClients` entry in the `TILES` array)

**Interfaces:**
- Produces: new `TKey` values `clientColName`, `clientColContact`, `clientColTaxId`, `clientColCredit`, `clientColOpenJobs`, `clientBillingSection`, `viewBillingStatementButton`, `viewReceiptButton`: consumed by Tasks 2-4.

- [ ] **Step 1: Add the new i18n keys**

In `src/lib/i18n.ts`, insert immediately after line 330 (`clientCreditTermsDays: { en: "{days} days", th: "{days} วัน" },`) and before the closing `} as const;`:

```typescript
  clientColName: { en: "Name", th: "ชื่อ" },
  clientColContact: { en: "Contact", th: "ติดต่อ" },
  clientColTaxId: { en: "Tax ID", th: "เลขผู้เสียภาษี" },
  clientColCredit: { en: "Credit Terms", th: "เงื่อนไขเครดิต" },
  clientColOpenJobs: { en: "Open Jobs", th: "งานที่เปิดอยู่" },
  clientBillingSection: { en: "Billing", th: "การเรียกเก็บเงิน" },
  viewBillingStatementButton: { en: "View Billing Statement", th: "ดูใบวางบิล" },
  viewReceiptButton: { en: "View Receipt", th: "ดูใบเสร็จรับเงิน" },
```

- [ ] **Step 2: Flip the home page Clients tile live**

In `src/app/home/page.tsx`, change the `tileClients` entry (currently):

```typescript
  {
    nameKey: "tileClients",
    descKey: "tileClientsDesc",
    icon: "C",
    href: "#",
    permission: "clients.view",
    live: false,
    color: "bg-rose-500",
  },
```

to:

```typescript
  {
    nameKey: "tileClients",
    descKey: "tileClientsDesc",
    icon: "C",
    href: "/clients",
    permission: "clients.view",
    live: true,
    color: "bg-rose-500",
  },
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

No git repo exists for this project folder (it's excluded from the parent repo's git tree): skip commit, move to next task.

---

### Task 2: Clients list page (`/clients`)

**Files:**
- Create: `src/app/clients/page.tsx`

**Interfaces:**
- Consumes: `getAccess`, `getLocale`, `getTheme`, `translate`, `clientDisplayName`, `AppHeader`, `prisma`, i18n keys from Task 1.
- Produces: route `/clients`, linked to from home page tile and from `/clients/new`'s cancel/back link (Task 3) and `/clients/[id]`'s back link (Task 4).

- [ ] **Step 1: Write the page**

Create `src/app/clients/page.tsx`:

```tsx
import Link from "next/link";
import { getAccess } from "@/lib/dal";
import { translate } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getTheme } from "@/lib/theme";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
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
```

- [ ] **Step 2: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors on the new file.

- [ ] **Step 3: Manual verification**

Run: `npm run dev` (uses `--webpack` per `package.json`)
- Visit `http://localhost:3000/login`, log in as `admin`/`admin123`.
- Visit `http://localhost:3000/clients`.
- Expected: a table listing existing seeded clients (name, contact, tax ID, credit terms, open job count), sorted alphabetically. No console errors in the terminal running `next dev`.
- If the seed data has zero clients, expected instead: the "No clients yet." empty-state row.

---

### Task 3: New client page (`/clients/new`)

**Files:**
- Create: `src/app/clients/new/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `src/app/actions/clients.ts` (existing, unmodified: accepts a `FormData` with fields `name`, `nameTh`, `address`, `taxId`, `contactInfo`, `creditTermDays`, and redirects to `/clients/[id]` on success).
- Produces: route `/clients/new`, linked from Task 2's "+ New Client" button.

- [ ] **Step 1: Write the page**

Create `src/app/clients/new/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getAccess } from "@/lib/dal";
import { translate, type TKey } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getTheme } from "@/lib/theme";
import { AppHeader } from "@/components/AppHeader";
import { createClient } from "@/app/actions/clients";

export default async function NewClientPage() {
  const access = await getAccess();
  const locale = await getLocale();
  const theme = await getTheme();
  const t = (key: TKey) => translate(locale, key);

  if (!access.can("clients.edit")) redirect("/home");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppHeader access={access} locale={locale} theme={theme} backHref="/clients" />

      <main className="mx-auto max-w-2xl space-y-6 p-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {t("newClientButton")}
        </h1>

        <form action={createClient} className="space-y-6">
          <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs text-slate-500 dark:text-slate-400">
                {t("clientFieldNameEn")}
                <input
                  name="name"
                  required
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="block text-xs text-slate-500 dark:text-slate-400">
                {t("clientFieldNameTh")}
                <input
                  name="nameTh"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="col-span-2 block text-xs text-slate-500 dark:text-slate-400">
                {t("clientFieldAddress")}
                <textarea
                  name="address"
                  rows={2}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="block text-xs text-slate-500 dark:text-slate-400">
                {t("clientFieldTaxId")}
                <input
                  name="taxId"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="block text-xs text-slate-500 dark:text-slate-400">
                {t("clientFieldContact")}
                <input
                  name="contactInfo"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="block text-xs text-slate-500 dark:text-slate-400">
                {t("clientFieldCreditTerms")}
                <input
                  type="number"
                  name="creditTermDays"
                  min={0}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
            </div>
          </section>

          <button
            type="submit"
            className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            {t("createClientButton")}
          </button>
        </form>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors on the new file.

- [ ] **Step 3: Manual verification**

With `npm run dev` running:
- Visit `http://localhost:3000/clients/new`.
- Fill in name (required) and a couple of other fields, submit.
- Expected: redirected to `/clients/[new-id]` (Task 4's page: will 404/error until Task 4 is done, that's expected at this point in the plan; confirm no error until then via checking the URL changed and no server 500).
- Re-visit `/clients` (Task 2's page) and confirm the new client now appears in the list with the right open-job count (0).

---

### Task 4: Client detail page (`/clients/[id]`)

**Files:**
- Create: `src/app/clients/[id]/page.tsx`

**Interfaces:**
- Consumes: `updateClient(clientId, formData)` from `src/app/actions/clients.ts` (existing, unmodified: revalidates `/clients` and `/clients/[id]` on success), `STAGE_LABEL_KEY` from `src/lib/stages.ts`, `dueBucket`/`formatDueLabel` from `src/lib/due-status.ts`.
- Produces: route `/clients/[id]`, linked from Task 2's list rows and Task 3's create redirect.

- [ ] **Step 1: Write the page**

Create `src/app/clients/[id]/page.tsx`:

```tsx
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
import { dueBucket, formatDueLabel } from "@/lib/due-status";

const DUE_BADGE_CLASS: Record<ReturnType<typeof dueBucket>, string> = {
  overdue: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  dueToday: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  upcoming: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

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

        {billableJob && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("clientBillingSection")}
            </h2>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/jobs/${billableJob.id}/billing-statement`}
                className="inline-block rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t("viewBillingStatementButton")}
              </Link>
              <Link
                href={`/jobs/${billableJob.id}/receipt`}
                className="inline-block rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t("viewReceiptButton")}
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors on the new file.

- [ ] **Step 3: Manual verification**

With `npm run dev` running, logged in as `admin`/`admin123`:
- Visit `/clients`, click into an existing client with jobs.
- Expected: edit form pre-filled with that client's data; job history table listing their jobs with correct stage badges and due-date badges (compare against `/jobs` for the same job to confirm identical badge styling); billing section appears only if that client has a job with a non-null `billing.invoiceNumber` (check a client from the Billing Statement/Receipt work in `HANDOFF.md`, e.g. a client with a job that reached the Billing stage).
- Edit a field (e.g. `contactInfo`), save, confirm the page reloads with the new value persisted and also reflected back on `/clients`.
- Click "View Billing Statement" / "View Receipt" if shown, confirm they land on the existing print views without error.
- Now go through the full create flow end-to-end: `/clients/new` → fill form → submit → lands on `/clients/[id]` → shows the new client with an empty job history and no billing section (since it has no jobs).
- Switch to Thai locale (EN/TH toggle in header) and re-check the same pages for any untranslated strings or layout breakage from longer Thai text.
- If a non-superadmin, `clients.edit`-lacking role is available (there isn't one among the three defaults: Sales has both `clients.view` and `clients.edit`), skip the read-only-form check; otherwise use "View As" with a custom role that has only `clients.view` to confirm the detail page renders the read-only text block instead of the form.

- [ ] **Step 4: Full regression pass**

Run: `npm run lint` and `npx tsc --noEmit` across the whole project one more time.
Expected: clean, no errors introduced by any of the three new pages or the i18n/home changes.

Click through `/home` → confirm the Clients tile is now colored/clickable (not the dimmed "Coming soon" state) and takes you to `/clients`.
