# Memory — Phase 3.1 Verification State Machine

Last updated: 2026-09-01

## What was built

- **`services/verification.service.ts`** (new) — the eight-state verification
  state machine as an explicit transition whitelist, with ten exported functions:
  `submitForVerification`, `resubmitForVerification`, `renewVerification`,
  `advanceToReview`, `approveVerification`, `rejectVerification`,
  `revertToReview`, `expireVerification`, `blacklistProfile`, `deactivateProfile`.
  Each guarded on actor role + current state; each writes an audit entry with
  first-class `previousState`/`newState`/`reason`. Every write is a
  compare-and-swap (0 docs updated → `conflict`). No payment wiring, no UI, no
  bypass.
- **`wajakazi-profiles` schema** — added `verificationSubmittedAt`,
  `verificationReviewedAt`, `verificationExpiry`, `verificationAttempts`,
  `lastVerificationPaymentId`, `blacklistedAt`, `deactivatedAt`, `rejectionReason`,
  `verificationNotes` (all field-locked to staff/admin).
- **`audit-logs` schema + `lib/audit.ts`** — added `previousState`/`newState`/`reason`
  fields and six new actions (`verification_advanced`, `verification_resubmitted`,
  `verification_reverted`, `verification_expired`, `verification_blacklisted`,
  `verification_deactivated`).
- **`payload-types.ts`** regenerated.

## Decisions made

- **Transition graph** (corrects the product spec): rejection is free to retry
  (`rejected → pending_review`) up to 3 rejections; the 4th forces a fresh fee
  (`rejected → pending_payment`). `verificationAttempts` resets to 0 on the next
  confirmed payment (`advanceToReview`).
- `verified → pending_review` exists for legal-name/ID change (`revertToReview`);
  no caller yet.
- Expiry is 12 months (`date-fns addMonths`), set on approve.
- `blacklisted` and `deactivated` are terminal (no outgoing transitions).
- Audit state goes in **first-class fields**, not `metadata`.
- `advanceToReview` (`pending_payment → pending_review`) has **no caller until
  Phase 4.4** (the real M-Pesa callback).

## Problems solved

- `advanceToReview` initially lacked an explicit from-check, so it could have fired
  `verified → pending_review`; added `verificationState !== "pending_payment"`
  guard.
- Payload's `update` "many" variant needs `where` (no `id`+`where` combo); used
  `where: { and: [{ id }, { verificationState: { equals: prev } }] }` then checked
  `result.docs.length === 0` for the compare-and-swap.
- Seeding scratch test users without hitting Clerk: set a fake `clerkId` (the
  `createClerkUser` hook skips when `clerkId` is present) and delete with
  `context: { fromClerkWebhook: true }` to skip the Clerk delete hook.

## Current state

- Phase 3.1 **complete**. Verified via a throwaway `tsx` scratch script — 21/21
  legal + illegal transitions passed — then deleted. `pnpm lint` (0 errors) and
  `pnpm build` pass. `progress-tracker.md` updated.
- Deferred: staff/admin document *view* (Phase 3.3) still unverified.

## Next session starts with

Phase 3.2 — Submit for verification: `/dashboard/mjakazi/verification`, a submit
action wired to `submitForVerification`, guarded on profile completeness and both
vault documents present. Incomplete profile cannot submit; complete → `pending_payment`.

## Open questions

- `verified → pending_review` identity-change *trigger* (profile/document-edit
  detection) lands in a later phase.
- "Fresh Certificate" re-upload on renewal is unenforced until a later phase.
- Free-resubmit boundary is `FREE_REJECTIONS = 3` with `<= 3` free / `> 3` paid —
  confirm this matches the intended "3 rejections" reading.
- `blacklisted → deactivated` is currently illegal (terminal); account deletion of
  a blacklisted profile may need this in Phase 10.1.
