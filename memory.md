# Memory — Phase 10.2: Admin dashboard

Last updated: 2026-09-09 14:10

## What was built

Phase 10.2 admin dashboard, end to end. Verified working by the developer in a running
environment.

- `src/services/admin.service.ts` (new) — `getRevenueSnapshot` (sums `confirmed` payments
  all-time + last 30 days, split `verification` vs `subscription`, via
  `payload.find({ pagination: false })`); `getVerificationThroughput` (counts
  `verification_approved` / `verification_rejected` audit entries in the last 30 days).
- `src/components/dashboard/admin/revenue-card.tsx` (new) — all-time + 30-day totals, each
  split by type, `KSh` thousands-separated.
- `src/app/(saas)/dashboard/admin/page.tsx` — expanded overview: 7 StatCards (pending
  verifications, verified wajakazi, active subscriptions, waajiri + wajakazi accounts,
  total profiles, suspended accounts), the `RevenueCard`, a verification-throughput card
  (approved/rejected, 30 days), and a Quick actions card placed in the stat grid next to
  "Suspended accounts".
- Docs updated: `build-plan.md` (10.2 marked DONE), `progress-tracker.md` (entry + admin
  backlog checkboxes), `ui-registry.md` (`RevenueCard`).

## Decisions made

- **Revenue + throughput are trusted reads** (`overrideAccess: true`) in the admin-only
  page — no actor gate, no audit entry (reads never audit).
- **Revenue source of truth is `confirmed` payments** — every other status ignored; 30-day
  window computed off `confirmedAt`.
- **Throughput sourced from `audit-logs`, not `wajakazi-profiles`** — so a profile reviewed
  more than once counts each review decision.
- **Recent activity feed dropped** at the developer's request — the `ActivityFeed`
  component was created then deleted; the backlog "Recent activity feed" item is unchecked
  again. Quick actions folded into the stat-card grid instead.

## Problems solved

- Payload 3.x has no aggregate/sum on the Local API — confirmed payments are summed in one
  pass with `payload.find({ pagination: false, select: { amount, paymentType, confirmedAt }
  })` rather than paginating manually.

## Current state

- Phase 10.2 complete; `pnpm lint` and `pnpm build` green (47 routes; only the known
  harmless Windows `sharp`/`detect-libc` EPERM symlink warnings).
- Developer has verified the feature works and will commit once all session docs are
  updated. All changes still uncommitted.

## Next session starts with

- After Michael commits: Phase 10.5 — the deferred Phase 5 sandbox verification pass (STK
  push, callback replay idempotency, subscription expiry), a test item not a build.
- Then Phase 11 (Concierge) — the largest, least-built phase.
- Remaining backlog fixtures still open: staff "today's activity" + "queue preview", and
  the mjakazi verification-expiry countdown.

## Open questions

- Phase 10.5 deferred sandbox verification still unrun.
- 10.3 (staff management + platform settings) and 10.4 (audit log viewer) were already
  built in earlier sessions — Phase 10 is otherwise complete.
