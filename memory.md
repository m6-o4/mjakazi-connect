# Memory — Phase 10 complete: Admin dashboard + sandbox verification

Last updated: 2026-09-09 14:40

## What was built

Phase 10.2 admin dashboard (end to end, developer-verified) and Phase 10.5 — the deferred
Phase 5 sandbox verification pass, run and passed.

- `src/services/admin.service.ts` (new) — `getRevenueSnapshot` (sums `confirmed` payments
  all-time + last 30 days, split `verification` vs `subscription`) and
  `getVerificationThroughput` (30-day `verification_approved`/`verification_rejected`
  counts from the audit trail).
- `src/components/dashboard/admin/revenue-card.tsx` (new) — all-time + 30-day totals, each
  split by type.
- `src/app/(saas)/dashboard/admin/page.tsx` — expanded overview (7 StatCards, revenue
  card, verification-throughput card, quick actions).
- Phase 10.5 verification pass — no build changes; all three checks passed in the sandbox:
  STK push end to end (`stk_sent` → `confirmed` on a real callback), callback replay
  idempotency (second replay refused + audit-logged, no double grant), and subscription
  expiry (flips to `expired`, new reveals blocked, prior contacts stay visible).
- Records updated this session: `build-plan.md` (10.5 marked DONE), `progress-tracker.md`
  (new 10.5 entry).

## Decisions made

- **Revenue + throughput are trusted reads** (`overrideAccess: true`) in the admin-only
  page — no actor gate, no audit entry (reads never audit).
- **Revenue source of truth is `confirmed` payments** — every other status ignored; 30-day
  window computed off `confirmedAt`.
- **Throughput sourced from `audit-logs`, not `wajakazi-profiles`** — so a profile reviewed
  more than once counts each review decision.
- **Recent activity feed dropped** at the developer's request — `ActivityFeed` was created
  then deleted; quick actions folded into the stat-card grid instead.

## Problems solved

- Payload 3.x has no aggregate/sum on the Local API — confirmed payments are summed in one
  pass with `payload.find({ pagination: false, select: { amount, paymentType, confirmedAt }
  })` rather than paginating manually.

## Current state

- Phase 10 fully complete — 10.1–10.5 all done. `pnpm lint` and `pnpm build` green
  (47 routes; only the known harmless Windows `sharp`/`detect-libc` EPERM symlink
  warnings).
- All Phase 10 changes still uncommitted.

## Next session starts with

- After Michael commits: Phase 11 (Concierge) — the largest, least-built phase.
- Remaining backlog fixtures still open: staff "today's activity" + "queue preview", and
  the mjakazi verification-expiry countdown.

## Open questions

- 10.3 (staff management + platform settings) and 10.4 (audit log viewer) were built in
  earlier sessions — Phase 10 is now complete (10.1–10.5 all done).
