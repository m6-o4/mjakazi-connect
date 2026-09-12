# Memory — Admin/staff account sections, moderation split & safe account deletion

Last updated: 2026-09-12 19:59

## What was built

Stage 1 of the section-by-section customer-feedback pass: administration of wajakazi and
waajiri accounts.

**Account sections (admin + staff)**
- Routes `(saas)/dashboard/accounts/wajakazi/page.tsx` and
  `(saas)/dashboard/accounts/waajiri/page.tsx` (new).
- `src/components/dashboard/accounts/accounts-table.tsx` (new) — `AccountsTable`: inline
  name editing via the shared `EditNameForm`, plus an admin-only permanent delete with a
  confirm dialog (no reason field).
- Shared mappers `src/lib/account-rows.ts` (new) — `AccountRow`,
  `toWajakaziRow`, `toWaajiriRow`. Both the account sections and moderation now use these,
  so displayed account status cannot drift.
- Shared badge maps `src/lib/account-badges.ts` (new).

**Deletion cascade** (`src/services/accounts.service.ts`)
- `deleteAccount` is admin-only and no longer takes a reason.
- `deleteMjakaziAccountData` / `deleteMwajiriAccountData` / `deleteAccountData` now also
  remove contact-unlocks, expressions-of-interest, hires, reviews, saved-wajakazi and
  concierge-cases (shortlist candidate rows pulled out for a deleted worker; whole cases for
  a deleted employer, before the subscription). Then profile, vault documents, photos,
  subscription, payments, user + Clerk.
- Deleting an employer captures workers held by that employer's active hires and releases
  each back to `availabilityStatus: "available"` — but only when no other active hire still
  holds them. `account_deleted` audit metadata includes `releasedMjakazi`.
- Shortlist cleanup pages 50 cases per pass and updates sequentially (no unbounded write
  burst, no 200-case truncation).
- Failures write an `account_deletion_failed` audit entry and return a "re-run to complete"
  error. The cascade is idempotent/resumable (no DB transaction).

**Moderation split**
- `ModerationTable` now owns suspend/reinstate only. Delete and rename were removed (props,
  state, dialog handling, imports); the required reason field stays.
- `src/app/actions/accounts.ts` — `deleteAccountAction(userId)` (no reason);
  `updateAccountAction` revalidates both account routes and moderation.

**Nav + overview**
- `src/lib/dashboard-nav.ts` — Wajakazi and Waajiri items for `admin` and `staff`.
- Admin overview account cards now link to the sections; staff overview gained
  Waajiri/Wajakazi cards with counts.

**Audit / types / docs**
- Added `account_deletion_failed` to `src/lib/audit.ts` and the `audit-logs` schema; ran
  `pnpm generate:types` (updated `src/payload-types.ts`).
- `context/architecture.md` + `context/project-overview.md`: erasure now states payment
  records are deleted with the account (they carry payer phone + raw callback), not
  retained.
- `context/ui-registry.md` and `context/progress-tracker.md` updated.

## Decisions made

- **Account sections vs moderation.** The account sections own viewing, renaming and
  (admin) deletion. Moderation owns suspend/reinstate only.
- **Delete is admin-only and confirm-only** — no reason required.
- **Erasure scope:** interaction records are removed with the account; audit logs are kept
  as the immutable record. Payments are deleted (not retained), because they carry
  identifiable data.
- **No DB transaction.** Mongo transactions need a replica set the project does not use;
  instead the cascade is idempotent/resumable and a failure is audited.
- **Shared row mapping** across moderation and account sections to prevent status drift.

## Problems solved

- Deleting an employer hard-deleted `hires` and bypassed `hire.service`'s availability
  reset, leaving counterpart wajakazi stuck at `availabilityStatus: "hired"` (hidden from
  the directory with no hire to explain it). Fixed with the release pass above.
- Shortlist cleanup originally capped at 200 cases and fired all updates concurrently — now
  paged and sequential.
- The account row/badge mapping was triplicated across moderation and both account pages —
  extracted to `account-rows.ts`.
- Removed the unused exported `AccountBadge` type.

## Current state

- Stage 1 feature-complete. `pnpm lint` — 0 errors (same pre-existing `react-hook-form`
  `watch()` warning in `concierge-brief-form.tsx`). `pnpm build` — passes, 49 routes
  (only the known Windows `sharp`/`detect-libc` EPERM warnings). **Uncommitted.**
- Michael has wiped all SaaS records, leaving only the admin account. No wajakazi/waajiri
  test data exists right now.
- Manual verification of the account sections and delete cascade is pending fresh records.

## Next session starts with

- **Stage 2: staff entry and sign-in.** Michael will drive it the same way as the admin
  walkthrough — narrate the flow, surface what breaks, then implement. Follow the same loop:
  read back the request, locate the code, propose the edit, confirm, then `pnpm lint` +
  `pnpm build`, and update `progress-tracker.md` / `ui-registry.md`.

## Open questions

- How staff accounts are created and entered (Clerk invite vs self sign-up then role
  assignment) — to be defined with Michael at the start of Stage 2.
- Manual re-verification of the account sections + extended delete cascade needs fresh
  wajakazi/waajiri records (create disposable test accounts).
