# Duplicate Job / Reprint Lineage: Design

Handles two things the user raised directly: (1) a job is often a repeat of
an earlier one (client reorders the same product), and retyping the whole
spec every time is wasted effort; (2) they want to know a job is a reprint
of an earlier one, without over-defining what "same" means. Recommendation
was presented conversationally and confirmed; this is that plan written
down before building, per this project's own practice.

## Schema

```prisma
model Job {
  ...
  duplicatedFromId String?
  duplicatedFrom   Job?    @relation("JobLineage", fields: [duplicatedFromId], references: [id])
  duplicates       Job[]   @relation("JobLineage")
}
```

Self-relation, nullable. Set once, at creation, by the duplicate action -
never edited afterward. No separate history/ledger model: this is "does
this job trace back to an earlier one," not a full audit trail.

**Lineage is defined by the act of duplicating, not by comparing fields.**
Paper/design/die-cuts are not compared to decide whether two jobs are
"the same" - that was considered and rejected: there's no artwork field to
compare yet (see the still-unbuilt artwork-image feature), and the user's
own stated rule ("different artwork = different job") makes field-equality
an unreliable proxy anyway. Whoever picks "start from existing job" is the
one deciding this is a continuation - the system just remembers that
choice. If someone updates artwork on the same job later, lineage is
untouched (same job row). If someone duplicates and then changes the
artwork, it still shows as reprinted-from - a "this came from that" trail,
not a guarantee of an identical product.

## Behavior

**New Job page (`/jobs/new`) gets a new optional step before the form:**
"Start from existing job" opens a modal (client component): a single text
input matching against job code, job name, or client name (OR - any
field matching includes the job), plus an optional year dropdown
(narrows further, AND'd with the text match) sourced from the distinct
years present in the job list. Both filter client-side over a list
fetched once, not a live search endpoint (this shop's total job count
over years doesn't justify a search API). The list includes jobs in
every stage, including archived - reprints often come from finished
work.

Picking a job in the modal closes it and pre-fills the New Job form:

| Carries over | Resets / new |
|---|---|
| Client, job name, short name | PO number, PO date |
| Product type, quantity, paper spec | Delivery due date |
| Prepress/postpress steps selected | New `jobCode` (always sequential/fresh) |
| Quote price, VAT rate, estimated DM/DL/MOH | Stage always starts at `QUOTATION` |

All pre-filled values stay editable before submitting - this is a
starting point, not a locked copy. Not picking a source job (the normal
"+ New Quote" path) behaves exactly as today, unaffected.

On submit, `createJob` additionally sets `duplicatedFromId` to the
source job's id if one was picked. No other change to that action.

**The source job is read-only through this whole flow.** Picking it in
the modal only reads its values to pre-fill the *new* job's form fields -
nothing ever writes back to the source job's row, regardless of its
stage (including archived). This is true by construction (the modal only
navigates and pre-fills; there's no code path that updates the source),
but worth stating explicitly since it matters here: an archived job is
finished, and duplicating it must never be a way to accidentally reopen
or alter it.

## UI: `/jobs/[id]`

Deliberately low-key, not part of the main job info at the top: a native
`<details>`/`<summary>` disclosure (no JS needed), collapsed by default,
placed right after `StageBreadcrumb`. Only rendered at all when there's
actually something to show (`job.duplicatedFrom` or
`job.duplicates.length > 0`); absent entirely otherwise, not an empty
disclosure.

- Collapsed: a small muted summary line, e.g. "Reprint history" - easy
  to skip past, doesn't compete with the job's real content.
- Expanded: "Reprint of **MS-0042**" (linked) if it has a source, and/or
  "Reprinted as: **MS-0087, MS-0130**" (each linked, most recent first)
  if it has descendants. Both can appear together (a job can be both a
  reprint of something and itself have been reprinted since).

## Code changes

- `prisma/schema.prisma`: `duplicatedFromId`/`duplicatedFrom`/`duplicates`
  self-relation on `Job`. Nullable, additive - no data-loss migration
  concern.
- `src/app/actions/jobs.ts`: `createJob` reads an optional
  `duplicatedFromId` field from the submitted form and sets it on create.
- `src/app/jobs/new/page.tsx`: fetch the lightweight job-picker list
  (`id`, `jobCode`, `jobName`, `client.name`/`nameTh`, `createdAt`,
  `stage`) alongside the existing `clients` fetch. Reads `?from=<jobId>`
  from `searchParams`; if present, fetches that job and passes its fields
  as `defaultValue`s into the existing inputs (same pattern already used
  by the Client/Material/User edit forms), and renders a hidden
  `duplicatedFromId` input in the form.
- New component `src/components/DuplicateFromJobModal.tsx` (client): the
  filter modal. On selection, navigates to `/jobs/new?from=<id>` (full
  reload of the server component, not client-side state) - keeps this
  page a plain server-rendered form exactly like the rest of the app,
  no new client-side form-state pattern introduced.
- `src/app/jobs/[id]/page.tsx`: fetch `duplicatedFrom` and `duplicates`
  relations, render the collapsed disclosure above.
- `src/lib/i18n.ts`: new keys (modal labels/filters, "Start from existing
  job" button, "Reprint history" summary, "Reprint of" / "Reprinted as"
  labels).

## Out of scope

- Auto-detecting "same lineage" from matching paper/design/die-cuts - see
  Schema section above for why this was rejected.
- Editing lineage after creation (re-pointing `duplicatedFromId`, breaking
  a link) - not asked for, adds a correction UI for a field that's set
  once and rarely wrong.
- A dedicated "browse all reprints of X" report/page - the two inline
  lines on the job detail page cover the stated need; a rollup view can
  be a later addition if it turns out to matter.

## Testing

Manual only: duplicate an archived job via the modal (confirm it's
findable by year/code/name/client filters), confirm the archived source
job itself is never modified (re-check its fields/stage after
duplicating), confirm the new job's form is pre-filled per the table
above and PO/delivery-date fields are blank, submit and confirm the new
job's collapsed "Reprint history" disclosure expands to show "Reprint of
[source]" and the source job's disclosure expands to show "Reprinted as:
[new job]", confirm a job created the normal way (no source picked) has
no disclosure at all, confirm Thai locale.
