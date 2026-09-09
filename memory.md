# Memory — Phase 10.1: Moderation (suspend / reinstate / delete)

Last updated: 2026-09-09 13:32

## What was built

Phase 10.1 moderation, end to end. Suspend (staff + admin), reinstate (admin), delete
(admin) for wajakazi + waajiri only. Every action requires a reason and writes an audit
entry. Verified working by the developer in a running environment.

- `src/services/moderation.service.ts` (new) — `suspendAccount`, `reinstateAccount`, both
  CAS-guarded on `users.accountState`, reason-required, audit-logged; `isSaasAccount` guard
  rejects any non-wajakazi/mwajiri target.
- `src/app/actions/moderation.ts` (new) — `suspendAccountAction`, `reinstateAccountAction`
  (zod reason, `getCurrentUser`, `revalidatePath("/dashboard/moderation")`).
- `src/app/(saas)/dashboard/moderation/page.tsx` + `src/components/dashboard/moderation/moderation-table.tsx`
  (new) — single moderation screen (staff + admin) listing wajakazi + waajiri with
  Edit/Suspend/Reinstate/Delete and a reason-required `AlertDialog`.
- `src/app/(web)/suspended/page.tsx` (new) — notice showing the suspension reason.
- `src/payload/collections/wajakazi-profiles/schema.ts` — new `suspended` checkbox
  (staff/admin-locked, indexed) folded into `DIRECTORY_VISIBLE` in
  `src/payload/access/access-control.ts`, so a suspended worker leaves the directory,
  saved lists, EOI send, and contact reveal.
- `src/services/subscription.service.ts` — `reinstateSubscription` + opened
  `TRANSITIONS.suspended → [active, expired]`.
- `src/services/accounts.service.ts` — `deleteAccount` now takes a required `reason`;
  list DTOs expose `accountState`.
- `src/lib/audit.ts` + `src/payload/collections/audit-logs/schema.ts` — added
  `account_suspended`, `account_reinstated`, `subscription_reinstated`.
- Enforcement: `(saas)/dashboard/layout.tsx` + `(payload)/layout.tsx` redirect
  `accountState === "suspended"` to `/suspended`.
- Folded: deleted `/dashboard/accounts/{wajakazi,waajiri}/page.tsx` and
  `accounts-table.tsx`; `dashboard-nav.ts` + both overview pages now link "Moderation"
  and a "Suspended accounts" StatCard.
- Docs updated: `project-overview.md` (authority matrix — blacklist dropped, no staff
  moderation), `architecture.md` (invariant #17 + `suspended` flag), `build-plan.md`
  (10.1 marked DONE), `ui-registry.md`, `progress-tracker.md`.

## Decisions made

- **Blacklist dropped** from moderation. The existing blacklist state machine
  (`blacklistProfile`, `blacklistSubscription`, `verificationState: blacklisted`,
  `blacklistState`, `subscriptionState: blacklisted`) is left **inert** — not wired, not
  removed.
- **Staff moderation out of scope** — staff are internal HR, handled outside the system.
- **Suspend hides a wajakazi from the directory** (and blocks new contact reveals) via a
  denormalized `suspended` flag on the profile; blacklist is no longer the removal path.
- **Reason delivery** — the `/suspended` notice shows the reason; suspension email stays
  deferred to Phase 12.1.
- **Single moderation page** replaces the two `/dashboard/accounts/*` pages.
- Deletion is the existing hard recursive cascade (profile → documents → photo →
  subscription → payments → user → Clerk), now reason-required; no soft-delete/retention.

## Problems solved

- **CRITICAL bug found in review, fixed**: `reinstateSubscription` used
  `tierExpiry && !isAfter(...) ? "expired" : "active"`, so a subscription suspended from
  `none`/`pending_payment` (null `tierExpiry`) reinstated to `active` — free contact reveal
  + EOI/hire without payment, and never expiring. Fixed to
  `!tierExpiry || !isAfter(...) ? "expired" : "active"`.
- `pnpm.ps1` is blocked by execution policy on this machine; run scripts with
  `pnpm.cmd` from PowerShell (e.g. `pnpm.cmd lint`, `pnpm.cmd build`,
  `pnpm.cmd generate:types`). The project is pnpm-based (`pnpm-lock.yaml`).

## Current state

- Phase 10.1 complete and tested working by the developer. `pnpm lint` and `pnpm build`
  green (47 routes incl. `/dashboard/moderation`, `/suspended`). Only the known Windows
  `sharp`/`detect-libc` `EPERM` symlink warnings remain (harmless).
- All changes uncommitted.

## Next session starts with

- Phase 10.2 — Admin dashboard (account counts, verification throughput, running payment
  total split by verification fees vs subscriptions). Admin overview currently only has
  four StatCards + the new "Suspended accounts"; 10.2 adds the revenue/throughput totals
  (`payments` collection) — see `context/build-plan.md` 10.2.
- Also pending: `context/progress-tracker.md` "Backlog — Dashboard Overview Fixtures"
  items (admin revenue snapshot, recent activity feed; staff today's activity, queue
  preview) and build-plan 10.5 (Phase 5 deferred sandbox verification: STK push, callback
  replay idempotency, subscription expiry).

## Open questions

- Suspension/deletion email notification still deferred to Phase 12.1 — only the
  `/suspended` notice exists today; deletion erases the account so its reason is audit-only.
- Deferred manual sandbox verification (build-plan 10.5) still unrun.
