# Decisions

Chronological log. Each entry: decision · reasoning · alternatives considered · risks accepted.

## Architecture

**SQLite (via better-sqlite3 driver adapter), not Postgres.**
Reasoning: single office PC hosting, zero-ops simplicity beats scalability the app doesn't need at 4 users.
Alternatives: Postgres (rejected, needs a separate server process to manage), Supabase (rejected then, revisited later, see Hosting section below).
Risk accepted: file-based DB means the app cannot run on serverless hosts (Vercel, Netlify free tier) without a real migration to a networked database.

**Dynamic DB-backed roles (Role/RolePermission tables), not a fixed enum.**
Reasoning: user wanted Discord-style custom roles, create/edit/delete from Settings, not just Admin/Sales/Floor hardcoded.
Risk accepted: `isSuperAdmin` flag on User exists specifically as a bypass so permission-toggling mistakes in Settings can never lock every account out of Settings itself.

**"View as" impersonation via a `view_as` cookie**, checked against the real session's `roleId`/`isSuperAdmin` server-side on every request, never trusts the cookie for escalation, only narrowing.

**i18n: hand-rolled dictionary (`src/lib/i18n.ts`), not next-intl or similar.**
Reasoning: whole app is a handful of pages for 4 users, a plain key/value table is easier to keep in sync than routing-aware i18n middleware.
Split into two files: `i18n.ts` (pure `translate()`, safe for client components) and `locale.ts` (server-only `getLocale()`, reads cookies). Learned the hard way, `i18n.ts` originally had `import "server-only"` blanketing the whole file, which broke the moment `StageDueChart` (a client component) needed to call `translate()`.

**Dark mode: cookie-based, not `prefers-color-scheme`.** Server-read in root layout, applied as a `dark` class on `<html>`, so there's no flash-of-wrong-theme on load.

## Font

**IBM Plex Sans + IBM Plex Sans Thai**, not the Next.js starter default (Geist) or a single do-everything font.
Reasoning: the EN/TH toggle means Thai script renders for real, and Geist has no Thai glyphs, it was silently falling back to whatever the OS substitutes. IBM Plex is purpose-built as a matched Latin/Thai pair for technical/operational software (not a marketing typeface), fits this app's Operate-mode nature better than a Persuade-mode "give it personality" pick.

## Workflow / permissions

**QC failure loops back to PRODUCTION**, not a separate rework stage. Simpler, matches how the floor actually thinks about it.
**Partial delivery was originally a boolean flag** (`deliveryPartial`), not a quantity split. Same simplification for `materialsReady` (still true, unaffected). **Reversed 2026-08-05**: replaced with a proper `Delivery` log (quantity/date/notes per shipment), multiple partial shipments allowed, stage only advances once the running total reaches `Job.quantity`. Direct user feedback asked for this: see `docs/superpowers/specs/2026-08-05-quantity-partial-delivery-design.md`. Recorded here explicitly per this file's own rule about not quietly overriding a prior decision.

**The finishing-step checklist was originally 4 fixed flags** (Coating/Die-cut/Glue/Assembly) with no phase grouping. **Replaced 2026-08-05** with a fixed Prepress (Design, Mock, Plate) → Printing → Postpress (Emboss, Varnish, Glue, Diecut, Hot Stamp, K Coating, Folding) pipeline, per direct user feedback: see `docs/superpowers/specs/2026-08-05-production-pipeline-design.md` for the full field-rename mapping and reasoning (`hasCoating`→`hasVarnish`, `hasAssembly`→`hasFolding`). Still optional-per-job and still unordered in enforcement: only the step *set* and *grouping* changed, not the underlying "pick what a job needs, toggle each done" mechanic.
**Product Type is a fixed enum** (BOX/CARD/TAG/FOLDED_CARD/PACKAGING/MENU/STICKER/OTHER), not free text.
**Admin-only quote authorship** (`jobs.create` gate) rather than allowing Sales to self-serve pricing without oversight, was an explicit early tradeoff the user picked.

## Paperwork / SmartBiz-replacement plan

Context: the company currently uses SmartBiz (Thai accounting software, Crystal Software Group) for VAT sale orders, printed quotations, and other paperwork. The explicit goal stated by the user is for M Sign Workflow to **replace** SmartBiz for these functions, SmartBiz's UI is outdated and overwhelming. This is a real scope expansion from "internal job tracker" to "also generates the client-facing paper trail."

Real document chain confirmed by reading actual SmartBiz-issued PDFs from Drive (`Msign Paperwork Flow.pdf`, real client "Bilou Fondue" / "Lily Tobeka" transactions): internal costing worksheet (tiered pricing by quantity) → Quotation → (client's own PO) → Sale Order → factory job ticket → Tax Invoice/Delivery Order (combined) → Billing Statement (aggregates multiple invoices) → Receipt.

**Phased build order**: Quotation → Sale Order → Tax Invoice/Delivery Order → Billing Statement + Receipt, in that order, because each extends an already-built stage of the existing workflow (New Quote, Confirm PO, Billing section) and the tax/legal-sensitive documents come after the pattern is proven on lower-stakes ones.

**Dropped tiered quantity pricing from scope.** The internal costing worksheet shows multiple quantity/price tiers, but the actual printed Quotation only ever shows one agreed quantity/price line. Building a full tiers table would have been solving a problem the printed document doesn't have. `Quote.quotePrice` stays a single value.

**VAT rate is stored per-Quote (`Quote.vatRate`, default 7), not a global constant.** Reasoning: real invoices show 0% VAT for some transactions (confirmed in a real supplier PO), so it has to be editable per job, and the rate used has to stay fixed to what was actually quoted even if the standard rate changes later.

**No discount field added**, even though real Sale Order/Tax Invoice documents have a "ส่วนลด (Discount)" line. The real examples all showed it as 0.00, unused. Didn't want to add a persisted-but-fake-always-zero field. Can add later if actually needed.

**Sale Order's "Order No." reuses `Job.jobCode`** rather than a new numbering sequence. One Sale Order per job, jobCode is already unique and sequential, avoided building a whole second document-numbering subsystem unasked.

**Billing Statement and Receipt have no persisted document number.** Unlike Tax Invoice (which has a real `invoiceNumber` field), these were left without a fabricated "official-looking" number since nothing tracks one, showing a fake sequential number would imply a real numbering system that doesn't exist.

**Billing Statement and Receipt are real multi-invoice aggregations**, not single-job printouts. Queries every job for the same client with an outstanding (Billing Statement) or paid (Receipt) invoice, not just the job you clicked through from. This is the actual point of those two document types, a single-invoice version would have been redundant with the Tax Invoice.

**Company letterhead info (`src/lib/company.ts`) was extracted from scanned/OCR'd PDF text and is flagged for verification**, specifically `taxId` and `email`, the source text was garbled in places (numbers split across lines).

**Fixed one likely OCR typo in the retention-of-title legal clause**: source read "ผู้ชาย" (a man) where context makes clear it means "ผู้ขาย" (the seller), standard retention-of-title phrasing. Corrected in `TaxInvoicePrintView.tsx`.

**Risk accepted, flagged explicitly to the user**: Tax Invoice is the compliance-sensitive document (Thai Revenue Code has real requirements for tax invoices). Everything is built and functionally verified, but should not become the real system of record (i.e., stop using SmartBiz for actual invoices) until an accountant reviews the template.

**Printing approach: a "Show on printout" toggle panel (Letterhead/Notes/Signatures), not exact paper-alignment tuning.** User explicitly deferred precise millimeter alignment for pre-printed 5-color stock until it can be tested on the real printer. `PrintControls.tsx` is shared across all four print views for this reason, one place to keep it consistent.

## Hosting (discussed, not yet acted on)

User will "come back for launch later." Recommendation on record if/when revisited: a cheap VPS (~$5-6/month) or Railway (similar cost, includes persistent volumes, no code migration needed) over Vercel+Supabase, since Vercel's free Hobby tier explicitly excludes commercial use per its own ToS, and Vercel+Supabase would require migrating off SQLite to Postgres, real work the VPS/Railway path avoids entirely.

## Home page stub tiles (Clients, Billing, Costing & Profit, Materials & Stock)

Built as their own spec/plan/implementation cycles, in the order: Clients page, Billing list view, Costing & Profit reports, Materials & Stock. Each is documented under `docs/superpowers/specs/`.

**Costing & Profit's revenue metric is `Quote.quotePrice`, not `Billing.amountDue`.** `amountDue` is a manually-entered invoicing field that doesn't exist until a job reaches Billing, and isn't guaranteed to match the quote. `quotePrice` exists on every job from creation, so it's the consistent source for a revenue rollup across jobs at any stage. Filtered to `stage != "QUOTATION"`: an unconfirmed quote isn't real revenue yet. Profit-by-month, by contrast, uses `ActualCost.actualProfit` (the only realized-profit field that exists), grouped by `ActualCost.closedAt`.

**Materials & Stock is a standalone catalog, not linked to `Job`.** `Job.paperType`/`paperWeight`/`paperSupplier` stay free text, unchanged: turning them into a dropdown tied to a `Material` record would touch the job creation form and require migrating existing free-text data, out of proportion to what was asked. Can revisit if the catalog proves useful enough that staff want jobs to reference it directly.

**Material stock is a single `quantityOnHand` number, no transaction ledger.** Explicit user choice over a full receipt/consumption history. Matches this project's existing simplification pattern (`Job.materialsReady` is a boolean, not a detailed log). A `reorderThreshold` field (optional) plus a low-stock badge was added on top of that as a cheap, high-value addition: a raw quantity number alone doesn't answer "should we reorder," which is the actual point of tracking stock at all.

**No `materials.edit` permission existed before this** (only `materials.view`, previously ungated since the page was a stub). Added mirroring the `clients.view`/`clients.edit` split exactly, so a role can be given read-only visibility into stock without being able to change pricing or quantities.

**Users management: `isSuperAdmin` is deliberately excluded from the `/users` UI**, staying script/seed-only. It exists specifically as a safety net so a permission-toggling mistake in Settings can never lock every account out of Settings itself (see the RBAC decision above): a routine account-edit form is exactly the kind of place that safety net needs to keep working even if the form itself is misused, so it isn't exposed there.

**Passwords are set/reset by Admin typing them directly**, bcrypt-hashed on save (same as `prisma/seed.ts`). No email-based reset flow, because this app has no email-sending capability at all (LAN-only, matches the hosting decision above). No self-service "change my own password" page either: account management is admin-driven only, consistent with `users.manage` being the sole gate (unlike Clients/Materials, this wasn't split into a view/edit pair).

**Deactivate only, no hard delete, for users.** `User.active` already existed and was already checked at login before this work: this only added a UI toggle, not new logic. Matches the no-hard-delete stance already established for jobs, and avoids orphaning the `Job.createdBy`/`ActualCost.closedBy` foreign keys a real delete would break.

## Direct user feedback on the built app (2026-08-05)

A round of feedback after using the app, each item built as its own spec/plan/implementation cycle, documented under `docs/superpowers/specs/`.

**Archived jobs removed entirely from the main Job Board, not just sunk to the bottom.** They used to sort to the bottom of `/jobs`; user wanted a proper archive to browse old records by client etc, so they now live only on the new `/jobs/archive` page (sortable by recently-closed/client/job code), and no longer render on `/jobs` at all. `updateBilling` now redirects to `/jobs` when a job is marked PAID (archived), rather than leaving the user on that job's now-archived detail page.

**Job Board's due-date chart rebuilt from one combined chart to one chart per stage**, per a hand-drawn mockup the user provided. Bars are individual due-date buckets (Overdue, Today, one bar per day for the next 7 days, "Later" catch-all) instead of one lumped "Upcoming" segment - matches the mockup exactly. Clicking a bar filters the job table below via `?stage=X&bucket=Y` query params (same server-side-filter pattern as the Billing status tabs, not a client-side state blob), clicking an already-active bar or a stage's own name toggles the filter back off. All chart filter links use `scroll={false}` (same fix `AppHeader`'s role switcher already used) so clicking one doesn't yank the page back to the top - the user asked for this explicitly after the first version shipped without it.

**`Job.shortName` added** (optional, falls back to `jobName`) after the user pointed out real job specs can run very long (a real example: a full descriptive name down to "Orchid Menu" for display purposes) - too long for the chart tooltip specifically. Not applied anywhere else in the UI yet, only the tooltip was the stated pain point.

**Print/preview separated via a `PrintLog` model, logged when the Print button is clicked**, not when a document is merely viewed on screen. **Risk accepted**: `window.print()` has no callback distinguishing a completed print from a cancelled one, so this records "printing was initiated," not a confirmed completion - the clearest signal actually available, flagged to the user as a real limitation, not silently glossed over. Also fixed a real redundancy found while doing this: "Print Billing Statement"/"Print Receipt" used to always show together once an invoice number existed, but each only has content in one specific payment state (something outstanding / something paid respectively) - either could silently redirect back with nothing printed. Both are now conditional on the same check each print page itself already used to guard its own content.

**Job on-hold is a display-layer override, not a change to `deliveryDueDate` or stage.** For the "client asked us to hold this job, we can't resolve or archive it" case: a held job is pulled out of red/amber urgency color everywhere it's shown (Job Board badge, per-stage charts) and shown neutral instead, but the actual due date and workflow stage are untouched. Editing `deliveryDueDate` itself to a new concrete date is a separate, still-unbuilt capability, only relevant when a real new date is known rather than an indefinite hold.

**Activity log scoped to stage transitions and production step completions only**, not a full field-level audit trail - matches exactly what the user described wanting to see logged, avoids logging every minor form edit as noise. **Notification targeting is by permission, not per-job picker, via one hardcoded starting rule** (everyone with `jobs.view_cost` notified when a job reaches `QC`) rather than a configurable rules engine - deliberately the smallest thing that matches the user's own example (a DM-tracking manager notified when production hands off), with `notifyByPermission(jobId, stage, permissionKey)` designed to make adding more rules trivial once it's clear which ones are actually wanted. **No manual @-mention/tagging** and **no push/real-time delivery** (notifications appear whenever `AppHeader` next renders, not live-pushed) - both real, distinct features beyond what was asked for.

## Deep polish pass (2026-08-06)

Full-app review/polish, no new scope - code-level read-through of every built area (paperwork, Job Board, workflow, Clients/Billing/Costing/Materials/Users, Settings/Roles, auth) plus `tsc`/lint/route-compile verification. **Browser-based visual QA was not possible this session**: no screenshot/browser tool was available, and minting a local test-session JWT to drive curl-authenticated checks was blocked by the environment's permission classifier (treated as credential forging regardless of context). Verification was therefore code-level plus `tsc --noEmit`, `npm run lint`, and hitting every touched route to confirm clean compilation (no 500s) - not a substitute for an actual browser pass, flagged here rather than silently skipped.

Fixes made, in order of severity:

- **New Job form failed silently if no client was picked or typed.** `createJob` had `if (!clientId) return;` with no error surfaced - the "existing client OR new client name" constraint can't be expressed via HTML `required` (it's an either/or across two different fields), so this was a genuinely reachable dead end, not just defensive code. Now redirects back to the form with a visible inline error.
- **RoleEditor could throw on Save if a role's name was cleared.** The name field isn't inside a `<form>` (Save lives in the fixed unsaved-changes bar), so HTML5 `required` never applied, and `saveRole` throws on an empty name. Added a client-side guard: Save disables and the bar's message swaps to a "name can't be empty" hint instead of letting the throw escape the async transition.
- **Client Detail page had the same dead-end billing links already fixed once elsewhere.** "View Billing Statement" / "View Receipt" showed as an unconditional pair whenever any job had an invoice number, the same redundancy the 2026-08-05 feedback round fixed on the job detail page (each document only has content in one specific payment state). Missed on this page during that round; now gated the same way (`hasOutstanding` / `hasPaid`, computed from the client's own jobs already being fetched).
- **Job Board and Archive empty-state rows used a hardcoded `colSpan`** that didn't track the permission-gated column count (`jobs.view_price`/`jobs.view_cost`/`jobs.view_production` each add columns). Now computed from the same conditions the `<thead>` uses.
- **Billing Statement's print "Show on printout" panel had a dead "Notes" checkbox** - that document has no notes/payment-terms block (unlike the other four print views), so toggling it did nothing. `PrintControls` now takes an optional `sections` prop so a document only offers checkboxes for sections it actually has.
- **Due-date bar charts (`ProcessStepCharts`) had no keyboard-focus equivalent for the hover tooltip** - a keyboard user tabbing to a bar got no preview of which jobs were in it, only a mouse-hover did. Added matching `onFocus`/`onBlur`. (`ReportBarChart` on the Costing page already had this pattern; the due-date chart was the one that had drifted from it.)
- **Home page's Costing and Clients tiles both used "C" as their icon glyph.** Costing changed to "$", also matches the violet accent already labeled "Costing tile icon" in `ReportBarChart.tsx`.
- **Removed dead "Coming soon" tile state** on the home page (`Tile.live`, always `true` since every tile shipped) and the now-unused `comingSoon` i18n key.
- **Extracted the identical letterhead block duplicated across all 5 print views** into `PrintLetterhead.tsx` - was a maintenance risk (company info change would've needed editing 5 files identically).
- Small a11y additions: `aria-haspopup`/`aria-expanded` on the notification bell button.

**Second pass, same session:**

- **Product Type names never went through the i18n system.** `PRODUCT_TYPE_LABEL` was a flat English-only map, unlike every other label in the app (stages, permissions, finishing steps), so Box/Card/Tag/etc always showed in English even with the locale toggle set to Thai. Converted to `PRODUCT_TYPE_LABEL_KEY` (same `Record<string, TKey>` pattern as `STAGE_LABEL_KEY`) with Thai translations added for all 8 types. These are routine product-category translations (Box/การ์อง, Card/การ์ด, Packaging/บรรจุภัณฑ์, etc.), not sourced from a real document the way the legal clause or company info were - worth a native speaker's confirmation, same caveat as the existing "K Coating" flag.
- **`ConfirmSubmitButton.tsx` was dead code** - defined, never imported anywhere; the identical inline `window.confirm` pattern was implemented directly in `RoleEditor`'s delete button instead. Removed.
- **Two unused i18n keys** (`clientsPageTitle`, `backToClients`) found via a full cross-reference of all 301 dictionary keys against actual usage - leftovers from the Clients page build where generic keys (`client`, `back`) ended up being used instead. Removed.
- **`DUE_BADGE_CLASS` was duplicated verbatim** in `jobs/page.tsx` and `clients/[id]/page.tsx`. Moved into `due-status.ts` (which already exists specifically as "the single source of truth... so both use the same buckets and never drift" - the sibling `DUE_STATUS_COLOR` export was already there, this constant had just drifted out).

**Third pass, same session - added missing error/not-found states:**

- **No `error.tsx` or `not-found.tsx` existed anywhere in the app.** `notFound()` is called from 9 different pages (bad job/client/material/user id), and several server actions `throw new Error(...)` on invalid state - both were falling through to Next.js's raw default pages, which for an internal tool meant for non-technical office staff is a jarring, unbranded experience. Added both at the app root, styled to match the rest of the app (dark mode included, since both render inside the root layout and inherit its `dark` class).
- **Verified against this exact Next.js version's docs before writing `error.tsx`**, per AGENTS.md's warning about training-data drift: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md` shows `unstable_retry` was added in **v16.2.0** (this app runs 16.2.12) and is now the recommended "try again" mechanism over the older `reset()` (it re-fetches and re-renders the segment instead of only clearing error state). Used `unstable_retry`, not `reset`.
- `error.tsx` must be a Client Component (Next.js requirement for error boundaries), so it can't call the server-only `getLocale()` the rest of the app uses - reads the `locale` cookie directly instead (`translate()` itself is already documented as pure/client-safe in `i18n.ts`).
- **Not verified live**: same session limitation as the rest of this polish pass - no browser tool and the JWT-minting curl workaround is blocked by this environment's permission classifier, so these two pages are confirmed via `tsc`/lint/doc-cross-reference, not an actual triggered error or 404 in a browser.

**Not fixed, flagged instead:**
- **Subtotal/Total terminology varies across the 5 print documents** (e.g. "รวมเป็นเงิน" vs "มูลค่า" for Subtotal). Left alone rather than unified, since each document's wording was sourced from a distinct real SmartBiz-issued PDF (see the Paperwork plan section above) and unifying it risks drifting from what an accountant will actually be reviewing. Worth a decision from the user (or the accountant review already on the books) on whether to normalize.
- **A superadmin mid-edit on RoleEditor who switches "View As" loses the unsaved edit without a confirm prompt.** The existing unsaved-changes guard intercepts clicks on `a`/`button` outside the editor; "View As" is a native `<select>`, whose `change` event isn't a click and can't be reliably intercepted/reverted the same way. Narrow scenario (requires being superadmin, mid-edit, and reaching for View As instead of Save/Reset) and the fix would need either a cross-component "dirty" flag or a fragile manual value-reset on the select - judged disproportionate to the risk for now, but noted here rather than silently left.
