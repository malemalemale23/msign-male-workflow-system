# Clients Page: Design

Part 1 of a 3-phase build (Clients page, Billing list view, Costing & Profit
reports: each phase gets its own spec/plan/implementation cycle). This spec
covers the Clients page only.

## Context

`HANDOFF.md` lists the Clients tile as "Coming soon" on the home page, with
no UI. The backend already exists: `src/app/actions/clients.ts` has working
`createClient`/`updateClient` server actions, `clients.view`/`clients.edit`
permissions are already defined in `src/lib/permissions.ts`, and
`src/lib/i18n.ts` already has a scaffolded set of Clients-page translation
keys (`clientsPageTitle`, `clientFieldNameEn`, `clientJobHistorySection`,
`saveClientButton`, etc.) from earlier work. This is UI-only work wiring
already-built pieces together: no schema changes, no new server actions.

## Routes

Mirrors the existing `/jobs`, `/jobs/new`, `/jobs/[id]` pattern exactly
(table list → dedicated new-item form → detail page with inline edit).

### `/clients` (list)

- Gated by `clients.view` (redirect to `/home` if missing).
- Table sorted alphabetically by `name`, columns: Name (EN, with TH beneath
  via `clientDisplayName`, matching the job board's client column), Contact,
  Tax ID, Credit Terms, Open Jobs (count of that client's non-`ARCHIVED`
  jobs, via `_count`).
- "+ New Client" button, shown only if `clients.edit`, links to
  `/clients/new`.
- Empty state uses the existing `clientsListEmpty` key.
- No search/sort UI (YAGNI given current client count; matches the
  project's stance on dropping unneeded complexity, e.g. tiered pricing).

### `/clients/new`

- Gated by `clients.edit` (redirect if missing).
- Form fields: name, nameTh, address, taxId, contactInfo, creditTermDays,
  using the already-scaffolded `clientField*` i18n keys.
- Submits to the existing `createClient` action, which already redirects to
  `/clients/[id]` on success.

### `/clients/[id]` (detail)

Gated by `clients.view` for read access. Three sections:

1. **Edit form**: same fields as `/clients/new`, pre-filled, submitting to
   the existing `updateClient` action bound to the client id (same pattern
   as `confirmPO.bind(null, job.id)` in `jobs/[id]/page.tsx`). If the viewer
   has `clients.view` but not `clients.edit`, render the values as plain
   text instead of inputs, no save button: same read-only-if-ungated
   pattern used for job forms elsewhere.
2. **Job history**: table of this client's jobs: jobCode (link to
   `/jobs/[id]`), jobName, stage badge (`STAGE_LABEL_KEY`), due-date badge
   (`dueBucket`/`formatDueLabel`/`DUE_BADGE_CLASS`), reusing the exact
   helpers and styling from `src/app/jobs/page.tsx` so it looks identical.
   Empty state uses `clientNoJobsYet`.
3. **Billing**: shown only if the client has at least one job with a
   non-null `billing.invoiceNumber`. Two link buttons to that client's
   Billing Statement and Receipt, pointing at
   `/jobs/[firstSuchJobId]/billing-statement` and `.../receipt`. Confirmed
   those routes already aggregate by `clientId` (query every job for the
   same client), not just the one job in the URL, so any qualifying job id
   works as the entry point.

## Home page

Flip the `tileClients` entry in `src/app/home/page.tsx`:
`live: false, href: "#"` → `live: true, href: "/clients"`.

## i18n

Reuse existing scaffolded keys. New keys needed, following the existing
`{ en, th }` pattern in `src/lib/i18n.ts`:

- Column header for open-job count on the list table
- View Billing Statement / View Receipt button labels for the detail page's
  billing section (distinct from the existing `printBillingStatementButton`/
  `printReceiptButton`, which are for the print views themselves, not this
  entry-point link)

## Out of scope (this phase)

- Client search/filter
- Deleting clients
- Billing list view and Costing & Profit reports (separate phases/specs)

## Testing

Manual verification only (no test suite in this project per existing
pattern): log in as a role with `clients.edit` (Admin or Sales), create a
client, edit it, confirm the job-history and billing sections render
correctly for a client with jobs vs. one with none. Log in as a role with
only `clients.view` (none currently, but simulate via View As with a custom
role) and confirm the form renders read-only.
