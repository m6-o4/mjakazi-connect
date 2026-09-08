# Memory — Phase 8.3 EOI nudge task + job type cleanup

Last updated: 2026-09-08 13:58

## What was built

**Phase 8.3 — EOI nudge task, end to end:**

- `src/jobs/eoi-nudge.ts` (new) — daily (`0 8 * * *`) job delegating to the service.
- `src/services/eoi.service.ts` — `sendAcceptedEoiNudges` plus helpers `loadMjakaziOwner`,
  `hasActiveHire`, `applyNudge`, `notifyNudge` (exported).
- `src/payload/collections/expressions-of-interest/schema.ts` — added `nudgesSent`
  (number, default 0) and `lastNudgedAt` (date).
- `src/lib/email.ts` — `sendEoiNudgeEmail` (role-aware copy: mwajiri → "confirm the hire",
  mjakazi → "mark yourself hired").
- `src/lib/audit.ts` + `src/payload/collections/audit-logs/schema.ts` — new `eoi_nudged`
  action.
- `src/payload.config.ts` — registered `eoiNudgeTask`; `src/payload-types.ts` regenerated.

**Job type cleanup (this session):**

- All four job files (`payment-timeout.ts`, `subscription-expiry.ts`,
  `verification-expiry.ts`, `eoi-nudge.ts`) had `TaskConfig<any>`. Replaced with the typed
  `TaskInputOutput` form: `TaskConfig<{ input: object; output: { expired: number } }>`
  (and `{ nudged: number }` for eoi-nudge). `pnpm lint` now 0 errors / 0 warnings;
  `tsc --noEmit` clean.

## Decisions made

- **Nudge at 7 and 14 days after `respondedAt`** of an accepted EOI, two nudges then
  silence, tracked by `nudgesSent` (0–2).
- **Idempotency via compare-and-swap on the exact prior `nudgesSent`**, with an
  `exists: false` clause so pre-8.3 accepted records (which predate the field) still
  match.
- **A non-reversed hire (`pending_agreement | agreed`) suppresses the nudge** — the
  question "did it result in a hire?" is already answered.
- Nudge is **email + `eoi_nudged` audit only, no PostHog event** (system job, not a user
  action). Schedule is 8am, not midnight, since it is a user-facing ask.
- **Job `TaskConfig` typed via the `TaskInputOutput` form**, not the slug-key form — the
  slug-key form references `TypedJobs['tasks']`, which is generated from
  `payload.config.ts` that imports the task (circular for standalone task files).

## Problems solved

- **`TaskConfig<any>` eslint warning** — resolved by typing as
  `TaskConfig<{ input: object; output: … }>` instead of a slug key.
- **`Where` type union error** in the nudge CAS (`or`/`equals` branches widened with
  `undefined` keys and failed Payload's `Where` index signature) — fixed by annotating the
  count clause `const countClause: Where` and giving both branches a single `or` shape.

## Current state

- **Phase 8.2 was committed** by Michael before this session's work started.
- **Phase 8.3 complete and compiled** — `pnpm lint` 0/0, `pnpm build` green (only the
  known harmless Windows `sharp`/`detect-libc` `EPERM` symlink warnings), `tsc --noEmit`
  clean.
- **Phase 8.3 changes are UNCOMMITTED** in the working tree.
- Docs updated: `progress-tracker.md` (8.3 entry), `build-plan.md` (8.3 "Built" note).

## Next session starts with

- **Commit the uncommitted Phase 8.3 changes**, then **manually verify the nudge task**:
  backdate an accepted EOI's `respondedAt` 8 days, run the task, confirm both parties get
  one email and a second run is silent; backdate 15 days and confirm the second nudge
  fires once then silence.
- Then **Phase 9.1 — Reviews** (`reviews` collection, submission gated on an unlock, one
  per unlock, staff moderation queue at `/dashboard/staff/reviews`). Re-check
  `context/build-plan.md` (9.1) and `context/progress-tracker.md`.

## Open questions

- The EOI `expired` state is still unused — 8.3 nudges _accepted_ interests only, so the
  "should an unanswered `sent` EOI ever auto-expire, and on what trigger?" question
  remains open.
- Carried forward, still unresolved: Phase 5 deferred manual sandbox verification (STK
  push, callback replay idempotency, subscription expiry); pre-expiry verification
  reminder email (12.1); "Extend" button in the subscription status card still uses the
  outline variant; `getContact` returns contact for a `blacklisted` (not deleted) profile
  (10.1).
