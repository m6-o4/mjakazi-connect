# Memory — Job skills + M-Pesa production check

Last updated: 2026-11-27 02:45 UTC

## What was built

- Added two new job skills to `JOB_OPTIONS` in `src/lib/profile-constants.ts`:
  `{ label: "Caregiver (Postnatal)", value: "caregiver_postnatal" }` and
  `{ label: "Nurse", value: "nurse" }`, placed after `Caregiver (Elderly)`.
- Regenerated `src/payload-types.ts` (`pnpm generate:types`) so the `jobsSkills`
  unions now include both new values.
- Confirmed the M-Pesa **production** credentials are working (live payment test
  passed). No credential values are stored anywhere in this memory.

## Decisions made

- `JOB_OPTIONS` in `src/lib/profile-constants.ts` is the single source of truth for
  job skills. Both new values propagated automatically — no other edit was needed:
  the mjakazi profile form (`OptionChips`), the Payload admin select, the
  directory/browse filters, the employment-history role select, and the referral
  role select all derive from it.

## Problems solved

- The new skills appeared "missing" from the profile form only because the browser
  had not been refreshed — it was not a code gap. No additional form change was
  required; the form already reads `JOB_OPTIONS`.

## Current state

- Both new job skills are live in the running dev server and the generated types.
- Uncommitted work in the working tree:
  - This session: `src/lib/profile-constants.ts` + `src/payload-types.ts`.
  - Carried over from the prior session: the entire off-platform referrals feature
    (see the previous memory — invite → emailed one-time link → staff moderation →
    public reference count) is still uncommitted and already in production.

## Next session starts with

- Commit the accumulated uncommitted work (job skills + the referrals feature).
- Then do the referrals **docs pass**, the only outstanding planned item from the
  prior session: update `context/architecture.md`, `context/code-standards.md` (add
  the `referral_invited` PostHog event), `context/build-plan.md`, then after
  sign-off `context/progress-tracker.md` + `context/ui-registry.md`.

## Open questions

- Carried over, still unresolved from the prior session:
  - No UI lists a *published* referral for takedown (the staff queue only shows
    `pending`; `rejectReferral` supports `published → rejected` but nothing surfaces it).
  - Confirm the daily `referral-expiry` job actually runs in production — nothing may
    be scheduling `/api/payload-jobs/run`, which would also stall expiry, EOI expiry,
    verification/subscription expiry and payment timeouts.
  - `renewVerification` is unwired; the mwajiri pricing grid wraps 3+1 at four tiers
    (left deliberately); the reconstructed `purchase-subscription.tsx` was never
    diffed against its pre-clobber copy.
