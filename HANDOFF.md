# Handoff

Read this first if picking up the project cold (new session, after `/clear`, etc). `DECISIONS.md` has the reasoning behind choices below, this doc is "what exists and what's next."

## What this is

Internal job workflow tracker for M Sign, a printing/packaging company in Thailand (~4 staff: Admin/Owner, Sales, Floor Manager). Next.js 16 (App Router, webpack not Turbopack, see gotcha below), Prisma 7 + SQLite, self-hosted on one office PC, LAN-only. Inspired by Odoo's structure but deliberately simplified.

Goal has expanded beyond "internal tracker": the explicit aim now is to **replace SmartBiz** (the Thai accounting software the company currently uses) for VAT sale orders, printed quotations, and other client-facing paperwork. See "Paperwork plan" in `DECISIONS.md`.

## Stack gotchas (read before touching code)

- **`next dev`/`next build` must use `--webpack`** (already set in `package.json` scripts). Turbopack corrupts a Tailwind v4 CSS class from `node_modules/next/dist/bundle-analyzer/`, causing every page to 500. Confirmed via direct A/B test, don't remove the flag.
- **After any `prisma/schema.prisma` change**: run `npx prisma migrate dev --name X`, then **`npx prisma generate`** (migrate doesn't always trigger it), then **restart the dev server**. The generated client gets cached in the running Node process, editing the schema and regenerating without restarting silently serves stale types/data.
- **A non-interactive shell can't confirm `migrate dev`'s data-loss prompt** (e.g. dropping/renaming a column with existing rows). Workaround that's worked reliably: `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script > prisma/migrations/<timestamp>_<name>/migration.sql`, apply it directly with `npx prisma db execute --file <that path>`, then `npx prisma migrate resolve --applied <timestamp>_<name>` to record it in migration history, then `npx prisma generate`.
- **Windows/PowerShell**: never rewrite files via `Get-Content`/`Set-Content` (mangles non-ASCII/Thai text in this locale). Use Write/Edit tools. Python is not installed.
- **Occasional one-off dev-mode artifact**: right after a schema-change restart, an already-open browser tab can throw a `[browser]`-prefixed error in the terminal log (stale RSC reference reconnecting). If every *fresh* request afterward returns 200 with no errors, it's this artifact, not a real bug - don't chase it, just hard-refresh the tab.
- **No test suite in this project.** Verification is `npx tsc --noEmit`, `npm run lint`, and manual browser walkthroughs (curl-based, with a self-signed session JWT for automated checks where a real browser isn't available - see any recent commit for the pattern).
- Demo login: `admin`/`admin123`, `sales`/`sales123`, `floor`/`floor123`. **Change before any real use** (see Your Move).

## What's built

**Core workflow**: full auth/RBAC (dynamic DB-backed roles, not a fixed enum; custom role creation; per-permission toggles; `isSuperAdmin` safety bypass; "View as" impersonation). Settings → Roles: Discord-style layout. 8-stage job workflow (Quotation → PO → Sale Order → Production → QC → Delivery → Billing → Archived), no dead-end stages. Full EN/TH toggle app-wide (`src/lib/i18n.ts`). Dark mode, cookie-based.

**Production pipeline**: Prepress (Design, Mock, Plate) → Printing → Postpress (Emboss, Varnish, Glue, Diecut, Hot Stamp, K Coating, Folding), optional per job (picked at quoting), toggle-to-mark/toggle-to-unmark, display order only (not enforced sequentially).

**Delivery**: quantity-tracked, multiple partial shipments per job (`Delivery` model), stage only advances to `BILLING` once the running total reaches `Job.quantity`, over-delivery rejected.

**Job Board (`/jobs`)**: excludes archived jobs (they live on `/jobs/archive` instead, sortable by recently-closed/client/job code). One due-date chart per stage (`ProcessStepCharts`) - bars are individual date buckets (Overdue/Today/next 7 days/Later/On Hold), hover shows which jobs, click filters the table below via `?stage=X&bucket=Y`, click again to clear. "Show:" dropdown: All / Compact / Overdue / Today.

**Job on-hold** (`Job.onHold`/`holdReason`): a display-only override pulling a job out of red/amber urgency treatment everywhere (Job Board badge, charts) without touching its due date or stage - for jobs a client asked to hold indefinitely.

**Activity log + notifications**: job detail page (`/jobs/[id]`) is a 2-column layout on large screens, right sidebar shows a per-job activity log (stage transitions + production step completions only). Bell icon in `AppHeader` with unread badge/dropdown; one hardcoded notification rule so far (`jobs.view_cost` holders notified when a job reaches `QC`).

**Printable paperwork** (the SmartBiz-replacement work, all 5 documents): Quotation, Sale Order (gated on a confirmed PO), Tax Invoice/Delivery Order (gated on an invoice number, **needs accountant review before real use**), Billing Statement and Receipt (real multi-invoice aggregations across a client's jobs). All 5 share `PrintControls.tsx` (Show-on-printout toggles, Print button, back link to the job) and `src/lib/company.ts` for letterhead. Billing Statement/Receipt buttons on the job detail page only show when actually applicable (something outstanding / something paid respectively), not unconditionally.

**Print log** (`PrintLog` model): records who printed which document and when, logged on the Print button click specifically (not on merely viewing/previewing a document) - visible as a "Print History" section on the job detail page.

**Error/not-found states** (`src/app/error.tsx`, `src/app/not-found.tsx`): added 2026-08-06, previously missing entirely (see `DECISIONS.md`). `error.tsx` uses the Next.js 16.2+ `unstable_retry` prop, not the older `reset()`.

**Job.shortName** (optional): a short/internal name for a job, falls back to `jobName`, currently only used in the chart hover tooltip.

**Clients** (`/clients`), **Billing list** (`/billing`, filterable by payment status), **Costing & Profit reports** (`/costing`: profit by month, revenue by product type, revenue by client), **Materials & Stock** (`/materials`, with a low-stock badge), **Users management** (`/users`, deactivate-only, `isSuperAdmin` not exposed in the UI) - all 5 home-tile stubs are now built out, no more "Coming soon."

**New Job form (`/jobs/new`, `NewJobForm.tsx`)** - rebuilt 2026-08-07 as a client component with real validation, per direct QA feedback:
- **Client picker is a single search-or-create combobox** (`ClientCombobox.tsx`): type to filter existing clients by English or Thai name, pick one from the dropdown, or if nothing matches, the typed text just becomes a new client's name (Thai name + optional address/tax ID/contact/credit-term fields appear automatically). Replaced the old separate dropdown + always-visible new-client inputs entirely, and made those extra client fields available inline instead of only via the Client page afterward.
- **Product Type is also a combobox now** (`ProductTypeCombobox.tsx`), same "type to filter" pattern, but simpler: fixed 8-value enum, no create-new case, and typed text that's never confirmed with a pick snaps back on blur rather than leaving a value that doesn't correspond to a real product type.
- **Both comboboxes share one deliberate keyboard rule**: nothing is arrow-key-highlighted by default, so pressing Enter without navigating never silently commits to whatever sorts first (e.g. typing "Fon" shouldn't blindly select "Fondue" over an actual client literally named "Fon" - only an explicit arrow press can pick a suggestion).
- **Submit validation shows every invalid field at once**, not just the first one the way native browser validation does one-at-a-time: `noValidate` on the form + a `validate-on-submit` class toggled on failed submit + a plain CSS `:invalid` rule (`globals.css`) that's inherently live - fields stop being red the instant they're fixed, no extra JS needed. Fixed a real bug in the process: the previous fix for "no client picked" used a server-side redirect, which reset the entire form on failure - validation is now client-side and blocks submission before anything is ever sent, so a failed attempt never loses what was typed.
- Quantity input has its native up/down spinner hidden (`.no-spinner` utility class in `globals.css`, opt-in per-field) and a "e.g. 1,000" placeholder.

**Job detail page (`/jobs/[id]`) changes, 2026-08-06/07:**
- **Spec section (paper + finishing steps) is now editable at any stage**, not just at creation - real business need: a client can change spec after work has already started. Previously permanently read-only after job creation.
- **"Send to QC" no longer requires every production step checked off first** - still shows a non-blocking note if steps remain, but doesn't gate the button.
- **Job on-hold moved and rescoped**: now only shown/settable during the `DELIVERY` stage, not as a general always-visible control. Meaning corrected to match the real use case - "client asked us to hold the finished product before shipping," not "pause the job at any point." Auto-clears (`onHold`/`holdReason`) when a job finishes shipping (`recordDelivery`), since the control disappears with the stage change and would otherwise have no way to ever be un-set again. **This refines/narrows the original 2026-08-05 On-Hold decision - see `DECISIONS.md`, not a quiet reversal.**
- **Delivery Instructions** (`Job.deliveryInstructions`, new field): general delivery/transportation notes for the whole job, editable any time (not stage-gated), distinct from the existing per-shipment `Delivery.notes`.
- **Billing notes** (`Billing.notes`, new field): free-text notes on the Billing form, previously had none.
- **Breadcrumb** (`StageBreadcrumb.tsx`): fixed truncated stage labels ("Quo...", "Sale...") - now shows full text with horizontal scroll instead of cutting off. (A click-to-filter-Job-Board version was tried and explicitly reverted per feedback - it's back to display-only.)

## Known gaps / stubs

- **No browser-based visual QA has been done on this app from within a Claude Code session** - no screenshot/browser tool has been available, and minting a local test-session JWT for curl-authenticated checks was blocked by the environment's permission classifier. All review to date (including the 2026-08-06 polish pass, see `DECISIONS.md`) has been code-level plus `tsc`/lint/route-compile checks. An actual browser walkthrough (desktop + mobile, light + dark) is still owed - this specifically includes the new `error.tsx`/`not-found.tsx` pages below, which have never actually been triggered and seen.
- Subtotal/Total terminology varies slightly across the 5 print documents (sourced from different real reference PDFs per document type) - flagged, not unified, see `DECISIONS.md`.
- A superadmin mid-edit on Settings → Roles who switches "View As" before saving loses the edit silently (the unsaved-changes guard doesn't cover that control) - see `DECISIONS.md`.
- No delete-job UI (matches the deliberate no-hard-delete stance used everywhere else in this app).
- No real printer test done, paper size/margin/alignment for the 5-color pre-printed stock is untested, only on-screen/print-preview output is verified.
- `src/lib/company.ts`: `taxId` and `email` were extracted from OCR'd PDF text with some garbling, double-check against a real current invoice.
- Billing Statement/Receipt have no persisted document number (see `DECISIONS.md` for why).
- **"K Coating" Thai label (`เคลือบ K`) is a best-effort guess, not a confirmed house term** - worth checking with whoever runs the postpress floor.
- Hosting/deployment not yet acted on, user said "come back for launch later" (see `DECISIONS.md` for the recommendation on record).
- No UI to edit `deliveryDueDate` to a new concrete date - only the on-hold override exists, for when the client gives a real new date instead of an indefinite hold.
- Only one notification trigger rule exists (`jobs.view_cost` holders on reaching `QC`) - `notifyByPermission` in `src/lib/activity.ts` makes adding more straightforward, but no others have been added yet.
- No manual @-mention/tagging notification path, no push/real-time delivery (notifications appear whenever `AppHeader` next renders) - both deliberately out of scope so far, see `DECISIONS.md`.
- `Job` and `Material` stay deliberately unlinked (`Job.paperType`/`paperWeight`/`paperSupplier` are still free text) - the "View stock" link on the job detail page is a shortcut to `/materials`, not an actual cross-check against what a job needs.

## Your Move (things only the user can do)

- [ ] Change demo passwords before real office use
- [ ] Verify `COMPANY.taxId` and `COMPANY.email` in `src/lib/company.ts` against a real current invoice
- [ ] Get an accountant to review the Tax Invoice template (`TaxInvoicePrintView.tsx`) before it replaces real SmartBiz invoices, especially the legal clause and Revenue Code compliance
- [ ] Test-print the Quotation (or any of the 5 documents) on the real printer/5-color paper stock to check alignment before relying on it
- [ ] Confirm "K Coating" is the right Thai term (`เคลือบ K`) with whoever runs the postpress floor
- [ ] Confirm the new Product Type Thai translations added 2026-08-06 (Box/กล่อง, Card/การ์ด, Tag/ป้าย, Folded Card/การ์ดพับ, Packaging/บรรจุภัณฑ์, Menu/เมนู, Sticker/สติกเกอร์, Other/อื่นๆ) match house terminology - see `src/lib/i18n.ts`
- [ ] Sanity-check the one notification rule (QC → notify `jobs.view_cost` holders) actually matches how the office wants to be alerted, and say if more rules are wanted (e.g. notify on reaching `PRODUCTION`, or on delivery)
- [ ] Decide on hosting when ready to launch (see `DECISIONS.md` recommendation)

## Natural next steps

Every home tile is live and every item from the last feedback round is built. A 2026-08-06 code-level polish pass covered printable paperwork, Job Board/workflow, and every Clients/Billing/Costing/Materials/Users/Settings page - see `DECISIONS.md` for what was fixed and what was flagged instead. Further work is either a "Your Move" item above, an actual browser QA pass (see Known gaps), hosting/launch, or new scope not yet discussed.
