# Memory — Phase 4.3 Payment Timeout + Verification Emails

Last updated: 2026-09-01 16:52

## What was built

- `src/lib/email.ts` (new) — `sendVerificationApprovedEmail` +
  `sendVerificationRejectedEmail` via Payload's `sendEmail` (Resend adapter),
  brand-token inline HTML, HTML-escaped interpolation.
- `src/services/verification.service.ts` — `loadWorkerEmail` + `notifyWorker`,
  called after `approveVerification`/`rejectVerification` commit (fire-and-forget).
- `src/jobs/payment-timeout.ts` (new) — Payload queue task, `schedule` every
  minute, delegating to the service.
- `src/services/payment.service.ts` — `expireTimedOutPayments()`: 2-min window,
  compare-and-swap `stk_sent` → `expired`, writes `payment_expired` audit.
- `src/payload.config.ts` — `jobs.tasks` registers `paymentTimeoutTask`.
- Docs updated: `context/progress-tracker.md`, `context/library-docs.md`.

## Decisions made

- **Dynamic subscription pricing = v1's `platform-settings.subscriptionTiers`
  array** (`tierId`, `name`, `price`, `durationDays`, `description`, `isActive`,
  `isConcierge`), NOT a separate `subscription-plans` collection. `subscriptions`
  and `payments` store `tierId` + `tierName` string snapshots (no relationships);
  `contact-unlocks` keeps `tierAtUnlock`. Concierge gated by `isConcierge`.
  "tier" = domain term, "plan" = display term. Recorded across build-plan /
  architecture / project-overview / code-standards / library-docs. Not built yet —
  lands in Phase 5.1/10.3.
- Verification approve/reject email pulled forward to Phase 3.3 (out of 12.1).
- Email is fire-and-forget — never blocks a state transition.
- Payment timeout window = 2 minutes (matches v1).

## Problems solved

- Payload task config must be typed `TaskConfig<any>` — plain `TaskConfig`
  constrains `slug` to `TaskType` (`keyof TypedJobs['tasks']`), empty before the
  task is registered. (Documented in library-docs.)
- Resend adapter's `payload.sendEmail` **throws** on failure (doesn't return an
  error object) — wrap in try/catch. (Documented in library-docs.)
- `pnpm` blocked by PowerShell policy — use `pnpm.cmd`.

## Current state

- Phases 3.3 (review queue + emails), 4.1, 4.2, 4.3 code-complete. `pnpm lint`
  (0 errors, 1 pre-existing `pages/schema.ts` warning) and `pnpm build` green.
- `payment-timeout` job confirmed firing every minute (autoRun logs
  "Running 1 jobs. new: 1").
- **No payment initiation UI/route yet** — a mjakazi can submit for verification
  (`draft` → `pending_payment`) but there is no "Pay" button; the initiate route
  is unbuilt and `initiatePayment()` has no caller.

## Next session starts with

Phase 4.4 — wire `payment.confirmed` → verification `pending_review` (atomic,
lock documents, audit, store payment reference). Resolve first: 4.4 only covers
the callback→transition wiring; the verification payment *initiation* (pay button
+ initiate route for `paymentType: verification`) has no explicit home in the plan
(the initiate route was deferred to 5.2 = subscription).

## Open questions

- Where does the mjakazi "pay verification fee" initiation live — extend 4.4 or a
  separate step? Needed before 4.3/4.4/emails can be verified end to end.
- `platform-settings` global (verification fee + subscription tiers) is built in
  Phase 10.3; services take `amount` as a parameter, never hardcode a price.
- Manual verification deferred (no interface): STK initiate→expire (4.3),
  approve/reject emails, and the 4.1/4.2 callback sandbox test.
