# Costing & Profit Reports: Design

Part 3 of 3 (Clients page and Billing list view are done). Scope from the
user's original request: "profit by month, revenue by product type, revenue
by client." As with the Billing list, a few metric-definition assumptions
are made explicit below rather than confirmed with the user first: flagged
so they're easy to change.

## Context

Two existing money fields drive this:

- `ActualCost.actualProfit` (`quotePrice - (actualDM + actualDL + actualMOH)`),
  set once via `saveActualCost` when a job's cost is closed out, alongside
  `ActualCost.closedAt`. Only jobs that have gone through that step have a
  profit figure: this is the system's one source of realized profit.
- `Quote.quotePrice`, set at job creation, present on every job (required
  field in `createJob`). `Billing.amountDue` is a separate, manually-entered
  invoicing amount that doesn't always exist yet and isn't guaranteed to
  equal `quotePrice`, so it's the wrong field for a revenue rollup that
  should cover jobs at any stage.

**Metric assumptions:**
- **Profit by month** = sum of `ActualCost.actualProfit`, grouped by the
  month of `ActualCost.closedAt`. Only cost-closed jobs contribute: a job
  still in production has no realized profit yet, and that's correct, not
  a gap.
- **Revenue** (for the other two reports) = sum of `Quote.quotePrice`,
  filtered to jobs where `stage != "QUOTATION"`: a bare, unconfirmed quote
  isn't real revenue yet; the filter starts counting once a PO is
  confirmed (`stage` moves to `PURCHASE_ORDER` or later). Every included
  job counts once, at its full quoted price, regardless of current stage.
- No date-range picker. Profit-by-month shows all months that have data
  (typically a handful, this is a 4-person shop), revenue reports are
  all-time totals. Add a range filter later if the data volume ever makes
  that necessary.

## Route: `/costing`

Gated by `costing.view` (existing permission, redirect to `/home` if
missing): deliberately independent of `jobs.view_cost` (which gates
per-job cost visibility on the job detail/board pages); a role could have
one without the other, and this report page only needs the one gate.

Three report sections, each a bar chart built on one shared client
component (`src/components/ReportBarChart.tsx`), reused three times:

### 1. Profit by Month

Vertical bar chart, one bar per month (chronological), height = `|profit|`,
color diverging by sign: profit ≥ 0 uses the same green already used for
"upcoming" due-date badges (`#0ca30c`, from `DUE_STATUS_COLOR` in
`src/lib/due-status.ts`), profit < 0 uses the same red used for "overdue"
(`#d03b3b`). A zero baseline line. Reusing this project's own existing
status colors rather than introducing a new palette, since the two ideas
(overdue-bad/upcoming-good, loss-bad/profit-good) are the same "bad vs.
good" semantic. A "Total profit" figure above the chart, summed across all
shown months.

### 2. Revenue by Product Type

Horizontal bar chart, one bar per `ProductType` enum value that has at
least one qualifying job, sorted descending by revenue, single flat violet
fill (`#7c3aed`, Tailwind `violet-600`) matching the Costing tile's own
icon color on the home page, so the report visually ties back to the tile
that links to it. Value labeled at each bar's end (small, fixed set of ≤8
categories: labeling every bar is the normal, useful treatment for a
short categorical bar chart, not the "label every point" anti-pattern the
skill warns about, which targets dense line/scatter data). Labels use
`PRODUCT_TYPE_LABEL` (English-only currently, matches every other place in
this codebase that shows product type: not fixing that pre-existing
inconsistency here, out of scope).

### 3. Revenue by Client

Same horizontal bar chart component, one bar per client with at least one
qualifying job, sorted descending, capped to top 10 by revenue (a "+N
more" note if truncated) so the chart stays readable if the client list
grows well past what fits on one screen; same violet fill for visual
consistency with report 2 (both are "revenue," not two different
identities needing separate categorical hues per the color formula: a
flat single-series fill is the correct call for each, not a full
categorical palette).

### Shared chart component contract

`ReportBarChart` props: `rows: { key: string; label: string; value: number }[]`,
`orientation: "vertical" | "horizontal"`, `colorFor?: (value: number) => string`
(defaults to the flat violet), `valueFormatter: (value: number) => string`.
Renders bars with 4px rounded data-ends, a 2px gap between bars, a hover
tooltip (exact value + label), and a text-token (not colored) value label
per bar. No legend box: every chart here is a single series, per the
skill's "a single series needs no legend" rule.

## Home page

Flip `tileCosting` in `src/app/home/page.tsx`: `live: false, href: "#"` →
`live: true, href: "/costing"`.

## i18n

New keys: `costingPageTitle`, `costingProfitByMonthSection`,
`costingRevenueByProductSection`, `costingRevenueByClientSection`,
`costingTotalProfit`, `costingNoData`, `costingMoreClients`.

## Out of scope (this phase)

- Date-range filtering
- Exporting the reports (CSV/print)
- Any report beyond the three named

## Testing

Manual only: log in as Admin (has `costing.view`), visit `/costing`,
confirm all three charts render against seed data, confirm hover tooltips
show correct numbers, confirm total profit sum is correct, confirm Thai
locale, confirm the empty state if a report has no qualifying jobs.
