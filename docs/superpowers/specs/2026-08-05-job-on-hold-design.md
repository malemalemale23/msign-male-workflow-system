# Job On-Hold: Design

Handles the case a user raised directly: a job is past its due date, but
the client explicitly asked to hold it: not a real problem, but it still
reads as urgent red everywhere due-date urgency is shown. Recommendation
was presented conversationally and confirmed; this is that plan written
down before building, per this project's own practice.

## Schema

```prisma
model Job {
  ...
  onHold     Boolean @default(false)
  holdReason String?
}
```

No new model: this is a per-job flag, not a history log. Matches the
project's existing simplification stance (`materialsReady`,
`deliveryPartial`-before-its-reversal) of a flat boolean over a richer
structure, until there's a real reason to want more.

## Behavior

**A held job is pulled out of urgency treatment everywhere due-date color
is shown, without changing its stage or archiving it:**

- **Job Board table due-badge** (`src/app/jobs/page.tsx`): shows a neutral
  "On Hold" pill instead of the red/amber/green urgency badge, regardless
  of how overdue the actual date is. `holdReason` (if set) is the pill's
  `title` tooltip.
- **Per-stage charts** (`ProcessStepCharts`): a held job buckets into a new
  distinct `onHold` bucket (neutral gray, not part of the
  red/amber/green urgency palette) instead of wherever its actual date
  would otherwise place it. Excluded from `overdueCount`/`dueTodayCount`,
  so it doesn't trigger the Overdue/Today quick-filter modes either.
- **`deliveryDueDate` itself is untouched.** This is a display-layer
  override, not a change to when the job was actually due: if the client
  later gives a real new date, that's a separate "edit due date"
  capability (doesn't exist yet, out of scope here, noted for later).

## UI: `/jobs/[id]`

New small section, always visible (to `jobs.view`), placed right after
the `StageBreadcrumb`:

- Read-only: a line stating hold status, and the reason if held.
- If `jobs.edit_logistics`: a checkbox + optional reason text input + Save
  button instead of the read-only line. Unchecking clears `holdReason`
  (no point keeping a stale reason for a job no longer held).

## Code changes

- `prisma/schema.prisma`: `onHold`/`holdReason` on `Job`.
- `src/app/actions/jobs.ts`: new `setJobHold(jobId, formData)`, gated by
  `jobs.edit_logistics`.
- `src/app/jobs/[id]/page.tsx`: new section per above.
- `src/app/jobs/page.tsx`: due-badge cell branches on `job.onHold` first.
- `src/components/ProcessStepCharts.tsx`: extend the bucket color type to
  `DueBucket | "onHold"`, add the neutral color.
- `src/lib/i18n.ts`: new keys (hold section labels, "On Hold" badge/bucket
  text, reason field).

## Out of scope

- Editing `deliveryDueDate` to a new concrete date (separate feature, only
  relevant when a real new date is known, not an indefinite hold)
- Auto-expiring holds after N days (doesn't fit "indefinite," per the
  user's own framing of the problem)
- A history of hold/unhold events (this is current-state only, matches
  the flat-boolean, no-ledger pattern used elsewhere)

## Testing

Manual only: put a job on hold with a reason, confirm the Job Board badge
turns neutral and the tooltip shows the reason, confirm it no longer
counts toward Overdue/Today chart filters and appears in a new "On Hold"
chart bucket, un-hold it and confirm it reverts to normal urgency
coloring based on its real due date, confirm Thai locale.
