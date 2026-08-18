# Quantity-Tracked Partial Delivery: Design

Second of three follow-up items from user feedback (production pipeline
overhaul is done; activity log + notifications is the third, separate spec).
**Reverses the existing `DECISIONS.md` entry** ("Partial delivery is a
boolean flag, not a quantity split"): noted there explicitly per that
file's own rule about not quietly overriding a prior decision. Scoped via
two clarifying questions, both answered with the recommended option:

1. **Multiple shipments over time**, not a single split. Each delivery is
   its own logged record (quantity + date), a job can receive any number
   of partial shipments until fully delivered.
2. **"Match with stock" means: delivered quantity can't exceed the job's
   ordered quantity** (`Job.quantity`). Not a Material-catalog deduction:
   `Job` and `Material` stay unlinked, consistent with both prior
   decisions on that point (Materials & Stock's original scoping, and the
   "View stock" shortcut added for the PO step).

## Schema

New model, one-to-many from `Job`:

```prisma
model Delivery {
  id          String   @id @default(cuid())
  jobId       String
  job         Job      @relation(fields: [jobId], references: [id])
  quantity    Int
  deliveredAt DateTime @default(now())
  notes       String?

  createdAt   DateTime @default(now())
}
```

**Assumption, additive:** `notes` (optional free text, e.g. "sent via Grab
courier"). Not explicitly requested, but a log entry with zero context
beyond a number and a date is thin: matches the low-cost-optional-field
pattern already used elsewhere (`Material.notes`, `Job.qcNote`). Drop it
if unwanted.

`Job.deliveryPartial` (boolean) is removed: superseded entirely by
`deliveries` and the derived remaining-quantity calculation.
`Job.deliveryActualDate` **stays**, but its meaning narrows to "date of
the *first* delivery" (set once, not overwritten by later partial
shipments): it's only ever used as a fallback invoice date on the Tax
Invoice / Billing Statement print views
(`job.deliveryActualDate ?? billing.createdAt`), which only need one date,
not a full history. No changes needed in those two print pages.

## Behavior

- **Recording a delivery**: quantity (required, must be > 0), optional
  notes. Server-side check: `sum(existing deliveries) + new quantity` must
  not exceed `Job.quantity`: reject with a thrown `Error` if it would
  (same pattern as `updateClient`'s empty-name check: a plain thrown
  `Error`, not a silent no-op, since over-delivering is a real mistake
  worth surfacing, not a validation state to quietly ignore).
- **Stage transition**: `Job.stage` only advances from `DELIVERY` to
  `BILLING` once the running total reaches `Job.quantity` (fully
  delivered). Until then, the job stays at `DELIVERY` stage so further
  shipments can keep being recorded from the same section. This replaces
  today's `markDelivered`, which always jumped straight to `BILLING`
  regardless of the (now-removed) partial flag.
- **No edit/delete on past delivery records**: append-only log, matching
  this project's existing no-hard-delete stance (no delete-job UI, no
  hard user delete either).

## UI: `/jobs/[id]` Delivery section

Replaces the current single checkbox + "Mark Delivered" button
(`src/app/jobs/[id]/page.tsx:360-375`) with:

- A small delivery history list (quantity + date, most recent first) if
  any deliveries exist yet.
- "Delivered X of Y &middot; Z remaining" summary line.
- A form: quantity input (defaults to the remaining amount, but editable
  down for an actual partial shipment), optional notes field, submit
  button. Label reads "Record Delivery" normally, or something indicating
  completion when the entered quantity would finish the job: kept
  simple: same button, the stage-flip on full completion is handled
  server-side, no separate UI mode needed.

Section visibility is already gated on `job.stage === "DELIVERY"`: once
a delivery completes the job (stage flips to `BILLING`), the section
naturally stops rendering, no extra logic needed for that.

## Code changes

- `prisma/schema.prisma`: add `Delivery` model, add `deliveries
  Delivery[]` to `Job`, remove `deliveryPartial`.
- `src/app/actions/jobs.ts`: replace `markDelivered` with
  `recordDelivery(jobId, formData)` implementing the logic above.
- `src/app/jobs/[id]/page.tsx`: fetch `job.deliveries` (include in the
  existing `prisma.job.findUnique` call), replace the Delivery section's
  JSX per above.
- `src/lib/i18n.ts`: new keys for the history list, summary line, quantity
  and notes field labels, record-delivery button. Old
  `partialDeliveryCheckbox` key becomes unused, removed.

## Out of scope

- Editing or deleting a recorded delivery
- Linking to Material stock consumption
- Partial-delivery print documents (Delivery Note per shipment): the
  existing Tax Invoice/Delivery Order document is unaffected

## Testing

Manual only: create/use a job at DELIVERY stage, record a delivery less
than the full quantity, confirm the job stays at DELIVERY stage and shows
correct remaining/history, record another delivery that completes it,
confirm stage flips to BILLING and the section disappears, confirm
attempting to over-deliver is rejected, confirm Thai locale, confirm the
Tax Invoice/Billing Statement print views still show a sensible invoice
date (from the first delivery).
