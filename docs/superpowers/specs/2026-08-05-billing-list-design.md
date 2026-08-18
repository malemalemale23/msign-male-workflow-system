# Billing List View: Design

Part 2 of 3 (Clients page done, this covers Billing list, Costing & Profit
reports is part 3). Scope taken directly from the user's original request:
"Billing list view (all invoices across every job, filterable by status)."
Assumptions below are reasonable defaults, not confirmed with the user:
flagged so they're easy to change later.

## Context

`Billing` is a 1:1 optional relation on `Job` (`invoiceNumber`, `amountDue`,
`paymentStatus` [`PENDING`/`PARTIAL`/`PAID`], `paymentDueDate`,
`paymentReceivedDate`). Editing already exists on the job detail page
(`updateBilling` action, gated by `jobs.edit_logistics`, in the Billing
section of `src/app/jobs/[id]/page.tsx`). `billing.view` permission already
exists and currently gates nothing (its tile is a stub). This phase is a
**read-only cross-job list**, editing stays on the job detail page: same
division of responsibility as the Clients page (list/detail views, writes
go through existing actions on existing pages).

## Route: `/billing`

- Gated by `billing.view` (redirect to `/home` if missing).
- Query: every `Job` where `billing.invoiceNumber` is not null (an actual
  invoice exists: jobs still in earlier stages have no `Billing` row at
  all and aren't "invoices" yet). Include `client` and `billing`.
- **Assumption**: only invoiced jobs count as "billing" rows. A job that
  reached the Billing stage but has no invoice number yet won't appear
  here (it has no invoice to show status for). Easy to loosen later if the
  user wants pre-invoice jobs visible too.

### Filter

Query-string based (`?status=PENDING|PARTIAL|PAID`, absent = all), rendered
as simple text links/tabs above the table, no client-side JS: matches the
Clients page's "no search UI" YAGNI stance and this project's plain-link
filtering elsewhere (EN/TH toggle, light/dark toggle are all link-forms,
not client components).

### Sort

Unpaid rows (`PENDING`/`PARTIAL`) first, soonest `paymentDueDate` first
(mirrors the Job Board's "most urgent first" rule); `PAID` rows after,
most-recently-received first. Matches the existing precedent of urgency
over recency.

### Columns

Job Code (link to `/jobs/[id]`), Client (`clientDisplayName`), Invoice
Number, Amount Due, Payment Status (badge, reusing the existing
`paymentPending`/`paymentPartial`/`paymentPaid` i18n keys with a
traffic-light color set distinct from the due-date badges), Payment Due
Date, Payment Received Date (only meaningful for `PAID` rows, "-"
otherwise).

### Totals

**Assumption, additive**: a small "Total outstanding" line above the table,
summing `amountDue` for currently-visible non-`PAID` rows. Cheap to compute
(already fetching the rows) and directly useful for a billing list; drop it
if unwanted.

## Home page

Flip `tileBilling` in `src/app/home/page.tsx`: `live: false, href: "#"` →
`live: true, href: "/billing"`.

## i18n

New keys (existing `paymentPending`/`paymentPartial`/`paymentPaid`,
`invoiceNumberLabel`, `amountDueLabel`, `paymentDueDateLabel`, `jobCode`,
`client` are reused): `billingPageTitle`, `billingColReceived`,
`billingFilterAll`, `billingTotalOutstanding`, `billingListEmpty`.

## Out of scope (this phase)

- Editing billing fields from the list (stays on job detail page)
- Costing & Profit reports (separate phase/spec)
- Client-side search/sort on the table

## Testing

Manual only, same approach as the Clients page: log in, visit `/billing`,
confirm filter links change the visible rows and URL, confirm totals math,
confirm empty state when a filter has zero matches, check Thai locale.
