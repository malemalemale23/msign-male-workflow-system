# Users Management: Design

Last of the four home-tile stubs. No schema change needed: `User` already
has everything (`name`, `username`, `passwordHash`, `roleId`,
`isSuperAdmin`, `active`). Only role *editing* exists today (Settings →
Roles); there's no UI to create a user account or change who's assigned to
which role: only the seed script does that. Scoped via three clarifying
questions, all answered with the recommended option:

1. **Admin types a password directly** (create or reset), bcrypt-hashed on
   save: same as `prisma/seed.ts` already does. No email flow (this app
   has no email-sending capability at all, LAN-only).
2. **`isSuperAdmin` stays out of this UI entirely**, script/seed-only.
   `DECISIONS.md` frames it as a rare safety net specifically so a
   permission mistake in Settings can't lock everyone out: a routine edit
   form is exactly the kind of place that safety net exists to guard
   against, so exposing a checkbox for it here cuts against its own
   purpose.
3. **Deactivate only, no hard delete.** `User.active` already exists and
   is already checked in `login()` (`if (!user.active) return { error:
   "invalid" }`): this is purely a UI toggle, not new logic. Matches this
   project's existing no-hard-delete stance (`HANDOFF.md` notes there's no
   delete-job UI either) and avoids breaking the `Job.createdBy`/
   `ActualCost.closedBy` foreign keys a hard delete would orphan.

## Permission

Gated entirely by the existing `users.manage` (its description already
says "create and deactivate user accounts"). Unlike Clients/Materials,
this isn't split into a view/edit pair: `users.manage` is all-or-nothing,
matching how it's already defined.

## Routes

- `/users`: table (Name, Username, Role badge, Active/Inactive status),
  active users first then inactive (alphabetical within each group, same
  "current business sinks to top" idea as the Job Board's archived-last
  sort), "+ New User" button.
- `/users/new`: Name, Username, Password (plain input, `type="password"`,
  required), Role (`<select>` populated from `prisma.role.findMany()`,
  same pattern as the client `<select>` on `/jobs/new`).
- `/users/[id]`: Name, Username, Role select, Active checkbox, and an
  **optional** "New password (leave blank to keep current)" field: only
  updates `passwordHash` if that field is non-empty, standard edit-form
  password UX.

No read-only branch (unlike Clients/Materials' view/edit split) since
there's only one permission gate here.

## Actions

New `src/app/actions/users.ts`:
- `createUser(formData)`: `requirePermission("users.manage")`, hashes the
  password with `bcrypt.hash(password, 10)` (same cost factor as
  `seed.ts`), creates the `User` with `active: true`.
- `updateUser(userId, formData)`: `requirePermission("users.manage")`,
  updates `name`/`username`/`roleId`/`active`; only touches `passwordHash`
  if a new password was submitted.

**No duplicate-username handling beyond the schema's `@unique` constraint.**
`createRole` (existing code, `Role.name` is also `@unique`) has no special
handling for that either: letting the constraint throw and surface Next's
default error boundary is this codebase's established convention, not
something to invent a new pattern for here.

## Home page

Flip `tileUsers`: `live: false, href: "#"` → `live: true, href: "/users"`.

## Out of scope

- Self-service password change (a logged-in user changing their own
  password): this is Admin-driven account management only
- Forced password change on next login
- Hard delete

## Testing

Manual only: log in as Admin, create a user with a role, log out, confirm
the new account can log in with the set password, deactivate it from
`/users/[id]`, confirm it can no longer log in, confirm the password-reset
field correctly leaves the password unchanged when left blank vs changes
it when filled in, confirm Thai locale.
