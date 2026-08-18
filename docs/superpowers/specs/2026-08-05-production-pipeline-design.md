# Prepress / Printing / Postpress Production Pipeline: Design

First of three follow-up items from user feedback on the current build
(the other two: quantity-tracked partial delivery, activity log +
notifications: separate specs, built one at a time). Replaces today's
flat production-step model entirely, scoped via three clarifying
questions, all answered with the recommended option:

1. **Steps stay optional per job**, same mechanic as today's
   `hasCoating`/`hasDieCut`/etc: picked at quoting time via checkboxes,
   only the steps a job actually needs show up on its detail page.
2. **Clicking a completed step un-marks it**, reopening it. This is
   already exactly how `toggleProductionStep` works today (`!step.done`
   toggles both directions): no new interaction mechanic needed, just
   extending the existing one to more steps.
3. **Replaces the old flags entirely**, not additive.

## Step list (fixed order, replacing today's 4 finishing flags + printDone)

**Prepress:** Design → Mock (incl. digital proofing) → Plate
**Printing:** Printing (unchanged from today's `printDone`: always
required, no `has*` toggle, matches current behavior)
**Postpress:** Emboss → Varnish → Glue → Diecut → Hot Stamp → K Coating →
Folding

**Field mapping / migration, each still a `has<Step>`/`<step>Done` boolean
pair matching the existing convention:**

| Old field | New field | Why |
|---|---|---|
| `hasCoating`/`coatingDone` | `hasVarnish`/`varnishDone` | The old generic "Coating" is superseded by the two specific coating types the user actually named (Varnish, K Coating): kept as a rename rather than adding a third redundant generic option. **Assumption:** existing "coating" data maps to Varnish specifically, not K Coating, since Varnish is the more common default finish. No real production jobs exist yet (`HANDOFF.md`: no real printer test done), so this is a safe, low-stakes call, not a real data-loss risk. |
| `hasDieCut`/`dieCutDone` | unchanged | Already matches the new list exactly. |
| `hasGlue`/`glueDone` | unchanged | Already matches the new list exactly. |
| `hasAssembly`/`assemblyDone` | `hasFolding`/`foldingDone` | Not in the user's new list by that name, but "assembly" for a box job *is* folding it into shape: treated as the natural rename rather than silently dropping the concept. |
| `printDone` | unchanged | Already matches, always required. |
| *(new)* | `hasDesign`/`designDone`, `hasMock`/`mockDone`, `hasPlate`/`plateDone` | Prepress, didn't exist before. |
| *(new)* | `hasEmboss`/`embossDone`, `hasHotStamp`/`hotStampDone`, `hasKCoating`/`kCoatingDone` | Postpress, didn't exist before. |

**Migration mechanics:** `prisma migrate dev` will handle the renamed
fields as drop-old-column/add-new-column (SQLite's diff engine can't infer
a rename from a schema edit alone): acceptable since only seed/test data
exists right now, not a real concern once actual jobs are entered.

## Ordering: sequence is informational, not enforced

**Assumption:** steps display in the fixed Prepress → Printing → Postpress
order (so the UI communicates the real production sequence), but
completing them out of order isn't blocked: same permissiveness as
today's coating/diecut/glue/assembly, which can be done in any order. The
existing "advance to QC" gate (all applicable steps must be done) is
unchanged, just recalculated across the larger step list. Enforcing strict
sequential gating (can't start Printing until Prepress is fully done, etc)
would add real complexity: blocking legitimate cases like fixing a
mistake out of sequence: and wasn't asked for explicitly, so it's left
out. Can be added later if it turns out to matter in practice.

## UI changes

**`/jobs/new`:** the existing `FINISH_OPTIONS` checkbox row (currently 4
checkboxes: Coating/Die-cut/Glue/Assembly) becomes 9 checkboxes across two
labeled groups, Prepress (Design, Mock, Plate) and Postpress (Emboss,
Varnish, Glue, Diecut, Hot Stamp, K Coating, Folding): Printing isn't a
checkbox, same as today.

**`/jobs/[id]` production section:** the current single flat list of
toggle buttons becomes three labeled sub-sections (Prepress, Printing,
Postpress), each listing only that job's applicable steps in fixed order,
using the exact same toggle-button component/mechanic already in place
(no new component needed for the toggle itself). "Send to QC" button logic
unchanged, just driven by the larger step list.

## Code changes

- `prisma/schema.prisma`: `Job` model field changes per the table above.
- `src/app/actions/jobs.ts`: `createJob`'s `data` object picks up the new
  `has*` fields from `formData`; `toggleProductionStep`'s `field` union
  type is extended to the full new set of `*Done` field names.
- `src/app/jobs/new/page.tsx`: `FINISH_OPTIONS` array grows to the new
  9-item set, grouped under two `<h3>`-style sub-labels within the
  existing "spec" section.
- `src/app/jobs/[id]/page.tsx`: the `ProductionStep` list-building logic
  splits into three arrays (prepress/printing/postpress) instead of one
  flat `allSteps` array, each filtered to `required` the same way as
  today; render three labeled `<div>` groups instead of one.
- `src/lib/i18n.ts`: new `finish*` keys for the 7 new named steps, two new
  section-label keys (`prepressSection`/`postpressSection`: reusing
  `finishPrint`'s translated label as the Printing sub-heading).

**Flagged for verification, same spirit as `company.ts`'s flagged
fields:** "K Coating" Thai label (`เคลือบ K`) is a best-effort
transliteration, not a confirmed house term: worth checking with
whoever actually runs the postpress floor.

## Out of scope

- Enforcing sequential step completion
- Linking any step to Materials & Stock consumption
- Per-step notes, timestamps, or "who did this" tracking (that's the
  activity-log item, a separate spec)

## Testing

Manual only: create a new job selecting a mix of prepress/postpress steps,
confirm only those appear on the job detail page grouped correctly,
confirm toggling works both directions (mark done, un-mark), confirm "Send
to QC" stays disabled until every selected step (across all three phases)
is done, confirm Thai locale, confirm an existing seeded job's `hasGlue`/
`hasDieCut` data survived the migration unchanged.
