# Materials & Stock: Design

Unlike Clients/Billing/Costing (which wired UI onto an already-existing
schema), this is genuinely new: no `Material` model exists yet. Scoped via
three clarifying questions with the user, all answered with the
recommended option:

1. **Both pricing and stock quantity matter equally**: a material catalog
   (paper/ink types with unit price) that also tracks current quantity on
   hand.
2. **Standalone, not linked to jobs.** `Job.paperType`/`paperWeight`/
   `paperSupplier` stay free text, untouched. The catalog is a separate
   reference page staff consult manually: no job-form changes, no data
   migration of existing free-text job data.
3. **Simple current-quantity field, no transaction ledger.** One
   `quantityOnHand` number per material, edited directly (received +X,
   used -Y, or corrected after a physical count): no history log.

## Schema addition

```prisma
model Material {
  id               String   @id @default(cuid())
  name             String
  nameTh           String?
  category         String?  // free text (e.g. "Paper", "Ink") - matches
                             // this codebase's existing free-text
                             // paperType/paperSupplier on Job, not a new enum
  supplier         String?
  unit             String?  // e.g. "sheet", "kg", "roll" - gives price and
                             // quantity a shared meaning
  unitPrice        Float?
  quantityOnHand   Float    @default(0)
  reorderThreshold Float?
  notes            String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

**Assumption, additive:** `reorderThreshold` (optional) plus a low-stock
badge when `quantityOnHand <= reorderThreshold`. Raw stock quantities are
much less useful without a "we should reorder" signal, and this project
already has a strong precedent for exactly this kind of urgency badge (the
due-date badges on the Job Board). Still "simple" per the user's answer:
it's two numbers compared, not a ledger. Threshold is nullable so a
material can be tracked without ever setting one, no badge shown in that
case.

## Permissions

`materials.view` already exists but is currently ungated (its tile is a
stub). Add `materials.edit`, mirroring the `clients.view`/`clients.edit`
pair exactly: view gates read access to the list/detail pages, edit gates
the create page and the save form (read-only text when absent, same
pattern as the Clients detail page).

## Routes

Same three-page shape as Clients, minus the job-history/billing sections
that don't apply here (this catalog isn't linked to jobs):

- `/materials`: table (Name, Category, Supplier, Unit, Unit Price,
  Quantity on Hand with a low-stock badge when applicable), gated by
  `materials.view`, "+ New Material" button gated by `materials.edit`.
  Sorted alphabetically by name, no search (same YAGNI stance as Clients).
- `/materials/new`: create form, gated by `materials.edit`.
- `/materials/[id]`: edit form (read-only if no `materials.edit`),
  gated by `materials.view` for read access.

## Actions

New `src/app/actions/materials.ts`: `createMaterial(formData)` and
`updateMaterial(materialId, formData)`, both `requirePermission("materials.edit")`,
mirroring `src/app/actions/clients.ts` exactly (trim-to-null string
helper, numeric parsing for `unitPrice`/`quantityOnHand`/`reorderThreshold`,
`revalidatePath`, redirect to the new record on create).

## Home page

Flip `tileMaterials`: `live: false, href: "#"` → `live: true, href: "/materials"`.

## Out of scope

- Linking `Job` to the material catalog
- Stock transaction history/ledger
- Low-stock notifications/alerts beyond the in-page badge
- Reordering workflow (purchase orders to suppliers)

## Testing

Manual only, same approach as prior phases: after `prisma migrate dev` +
`prisma generate` + dev server restart (per this project's schema-change
gotcha in `HANDOFF.md`), log in, create a material, edit it, set a
quantity below its reorder threshold and confirm the low-stock badge
appears, confirm Thai locale, confirm read-only rendering for a
`materials.view`-only role via View As.
