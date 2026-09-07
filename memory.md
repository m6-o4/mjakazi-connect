# Memory — Phase 7.1 verification expiry complete (critical path done)

Last updated: 2026-09-07 10:58

## What was built

**Phase 7.1 — verification expiry job** (the last step of the revenue critical path):
- `src/jobs/verification-expiry.ts` — daily job (`0 0 * * *`, `TaskConfig<any>`) delegating
  to the service.
- `src/services/verification.service.ts` — new `expireExpiredVerifications` (polls `verified`
  profiles past `verificationExpiry`, expires each idempotently by reusing the existing
  `expireVerification` CAS transition). `expireVerification` now emails the worker on
  success via the `notifyWorker` helper.
- `src/lib/email.ts` — new `sendVerificationExpiredEmail` ("renew to stay visible").
- `src/payload.config.ts` — registered `verificationExpiryTask` in `jobs.tasks`.
- `src/payload/collections/wajakazi-profiles/hooks/revalidate-profile.ts` — wrapped
  `revalidatePath`/`revalidateTag` calls in try/catch (bug fix, see below).

**Minor UI fix** — `src/payload/blocks/wajakazi-archive/component.tsx`: the two "View all
wajakazi" buttons now use the posts archive block's explicit button styling (dropped the
`buttonVariants` outline/lg treatment; removed the unused import).

## Decisions made

- The worker expiry email was pulled forward out of the Phase 12.1 notifications sweep
  because 7.1's "Done when" requires "worker emailed"; a **pre-expiry reminder** email is
  still deferred to 12.1.
- Revalidation in `wajakazi-profiles` hooks is best-effort: the directory pages are
  dynamic (no cache), only the SSG homepage `/` matters, and outside a request context
  there is nothing to invalidate — so a missing request store is swallowed, not thrown.

## Problems solved

- **`revalidatePath` throws `Invariant: static generation store missing` outside a request
  context.** The `verification-expiry` job runs in Payload's background queue (no request
  store), so the `revalidateProfile` after-change hook threw. Payload captured the throw and
  returned `docs: []` + an error, so `applyTransition` misread the CAS as a `"conflict"` and
  skipped the `verification_expired` audit entry **and** the worker email — even though the
  state write had already committed. Fixed by try/catching the revalidate calls. Recorded in
  `context/library-docs.md` (Next.js 16 traps).
- Confirmed the **subscription** (`subscription-expiry`) and **payment** (`payment-timeout`)
  jobs are NOT affected — `subscriptions` and `payments` have no revalidate hooks, unlike
  `wajakazi-profiles`/`pages`/`posts`.

## Current state

- Phase 7.1 **complete and manually verified**: backdated a verified profile's
  `verificationExpiry`, ran the task via a throwaway `tsx` script — `verified →
  verification_expired`, 2 eligible profiles expired, `verification_expired` audit entry
  written, worker expiry email delivered. The scratch script has been deleted.
- The revenue **critical path is now complete end to end** (identity → profile → documents →
  verification → payment → review → directory → subscription → contact unlock → verification
  expiry).
- `pnpm lint` 0 errors; `pnpm build` green.
- Docs updated: `progress-tracker.md`, `build-plan.md`, `library-docs.md`.

## Next session starts with

- **Phase 8 — Expressions of Interest and Hires**: 8.1 EOI, 8.2 availability/hire
  confirmation, 8.3 nudge task. Re-check `context/build-plan.md` (Phase 8 section) and
  `context/progress-tracker.md`.

## Open questions

- Phase 5 deferred manual sandbox verification (STK push, callback replay idempotency,
  subscription expiry) may still be outstanding.
- Pre-expiry verification reminder email still deferred (12.1).
- Minor: "Extend" button in the subscription status card is still the outline variant.
- `getContact` returns contact for a `blacklisted` (not deleted) profile — permanent-unlock
  vs moderation is un-designed (Phase 10.1).
