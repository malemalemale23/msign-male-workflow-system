# Activity Log & Notifications - Design

Last item from the original feedback batch. Two related but distinct
pieces, per the user's own framing: a per-job activity log (right side of
the job detail page) and a notification system (specific people alerted
when something relevant happens - their example: a manager tracking DM
costs gets notified when production hands off to the next step). Scoped
via four clarifying questions, all answered with the recommended option.

## Scope decisions

1. **Log records stage transitions and production step completions
   only**, not every field edit. Matches exactly what the user described
   ("finish their process and send to next").
2. **Notifications are automatic, tied to events.** No manual
   @-mention/tagging system, that's a distinct feature (a comment input, a
   person-picker) beyond what was described.
3. **Targeted by permission, not picked per job.** A small fixed rule set
   (e.g. "notify everyone with `jobs.view_cost` when a job reaches QC"),
   no per-job recipient picker to build or maintain for a 4-person shop.
4. **Bell icon + dropdown in `AppHeader`**, not a separate notifications
   page. Matches where account-level UI already lives (theme/locale/View
   As/sign out).

## Schema

```prisma
enum ActivityType {
  STAGE_CHANGE
  STEP_COMPLETED
  STEP_REOPENED
}

model ActivityLog {
  id        String       @id @default(cuid())
  jobId     String
  job       Job          @relation(fields: [jobId], references: [id])
  type      ActivityType
  // STAGE_CHANGE: the new JobStage value. STEP_COMPLETED/STEP_REOPENED:
  // the step's field name (e.g. "glueDone") - translated in the UI, not
  // stored pre-translated, same reasoning as everywhere else in this app.
  detail    String
  actorId   String
  actor     User         @relation("ActivityLogActor", fields: [actorId], references: [id])
  createdAt DateTime     @default(now())
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation("NotificationRecipient", fields: [userId], references: [id])
  jobId     String
  job       Job      @relation(fields: [jobId], references: [id])
  stage     String   // the JobStage that triggered it
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

## Trigger rule (v1)

**Assumption, the one concrete starting rule:** when a job's stage
advances to `QC` (production work is done, the floor is handing it to the
next step), every active user holding `jobs.view_cost` gets a
notification. This is the closest direct match to the user's own example
(a DM-tracking manager notified when production hands off). Deliberately
one rule, not a configurable rules engine - a hardcoded array of
`{ stage, permissionKey }` in code, trivial to extend with more rules
later once it's clear which ones are actually wanted (e.g. notify
`jobs.edit_logistics` when a job reaches `PRODUCTION`, materials need
ordering).

**Recipient lookup**: every `User` whose `Role` has a `RolePermission` row
for the key, plus every `isSuperAdmin` user (who bypass permission checks
entirely, so they should always be reachable), restricted to `active`
users.

## Code changes

- `prisma/schema.prisma`: `ActivityType` enum, `ActivityLog`,
  `Notification` models; `Job` gets `activityLogs`/`notifications`
  relations, `User` gets `activityLogs`/`notifications` relations (named,
  since `User` already has multiple relations to itself elsewhere).
- New `src/lib/activity.ts`: `logActivity(jobId, actorId, type, detail)`
  and `notifyByPermission(jobId, stage, permissionKey)` helpers, both
  plain Prisma writes, no permission check of their own (called from
  inside actions that already checked).
- `src/app/actions/jobs.ts`: call `logActivity` from every stage-changing
  action (`confirmPO`, `updateSaleOrder`, `advanceToQC`, `submitQC`,
  `recordDelivery`, `updateBilling`) and from `toggleProductionStep`
  (`STEP_COMPLETED` or `STEP_REOPENED` depending on the new value).
  `advanceToQC` additionally calls `notifyByPermission(jobId, "QC",
  "jobs.view_cost")`.
- New `src/app/actions/notifications.ts`: `markNotificationRead(id)`.
- `src/app/jobs/[id]/page.tsx`: layout changes from single-column
  (`max-w-3xl`) to a two-column grid on large screens (`max-w-5xl`, main
  content + a `320px` sidebar), stacking to one column below `lg`. New
  sidebar section renders `job.activityLogs` (newest first, with actor
  name + relative-ish date), translated per `type`/`detail`.
- `src/components/AppHeader.tsx`: fetch the session user's notifications
  (most recent ~10, unread-first), render a new `NotificationBell` client
  component next to the existing header controls.
- New `src/components/NotificationBell.tsx` (client component): bell
  icon + unread count badge, click opens a dropdown listing notifications,
  clicking one calls `markNotificationRead` and navigates to the job.
- `src/lib/i18n.ts`: new keys for activity descriptions, sidebar section
  title, bell/dropdown text.

## Out of scope

- Manual tagging/mentioning a specific person
- Additional trigger rules beyond the one above (easy to add later, not
  guessing at more without a real request)
- Push/real-time delivery (websockets, polling) - notifications appear
  whenever the header next renders (any navigation), not live-pushed
  mid-session
- Deleting/archiving notifications, only mark-as-read
- A full activity log across the whole app (Job Board level) - this is
  per-job only, matching the "right side of the job detail page" ask

## Testing

Manual only: advance a job through PO -> Sale Order -> Production ->
toggle a production step -> QC, confirm each transition logs an activity
entry with the right actor/label, confirm reaching QC creates a
notification for every `jobs.view_cost` holder (Admin by default) and NOT
for others, confirm the bell shows the right unread count and marks read
on click, confirm Thai locale on both the log and the bell.
