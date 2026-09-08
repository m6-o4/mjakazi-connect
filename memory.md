# Memory — Phase 9.1 Reviews + end-contract flow (and assorted follow-ups)

Last updated: 2026-09-08 21:15

## What was built

**Phase 9.1 — Reviews, end to end:**
- `src/payload/collections/reviews/schema.ts` (new) — sealed collection, unique
  `[mwajiri, mjakazi]`; fields `reviewerName` (snapshot), `rating` (1–5), `comment`,
  `state` (`pending | published | rejected`), `rejectionReason`, `reviewedAt`,
  `hiddenByWorker`.
- `src/services/review.service.ts` (new) — the single authority: `submitReview`,
  `listPendingReviews`/`approveReview`/`rejectReview`, `setReviewVisibility`,
  `listWorkerReviews`, `getPublicReviews` (aggregate), `getReviewFormState`,
  `listReviewedMjakaziIds`.
- `src/app/actions/reviews.ts` (new) — submit / toggle visibility / staff approve-reject.
- UI: `src/components/rating-stars.tsx`, `dashboard/mwajiri/browse/leave-review-form.tsx`,
  `dashboard/mjakazi/reviews/reviews-panel.tsx`, `dashboard/staff/reviews/review-queue.tsx`,
  `web/directory/profile-reviews.tsx`, and `(saas)/dashboard/staff/reviews/page.tsx`.
- `review_*` audit actions (`lib/audit.ts` + `audit-logs/schema.ts`); `review.service`
  added to the invariant-#15 exemption list in `architecture.md`.
- `review_submitted` PostHog event (`rating`) fired from `LeaveReviewForm`.

**End-contract flow (review entry point for hired wajakazi):**
- `hires` schema gained `ended` terminal state + `endedAt` (distinct from `reversed`).
- `hire.service.ts`: `endHire` (either party ends an `agreed` hire → `ended`, releases the
  mjakazi back to `available`, `hire_ended` audit), plus `listHiresForMwajiri`
  (`listHires` is now mjakazi-only).
- `HireConfirmCard` (mwajiri) and `HireInbox` (mjakazi): on an `agreed` hire the **Reverse**
  button is gone, replaced by **End contract**; only the mwajiri's end opens `LeaveReviewForm`
  inline; ended-but-unreviewed hires show **Leave a review**; reviewed hires show a badge.
- `sendHireEndedEmail` template + `notifyHireEnded` — counterpart notified on end (the
  missing "end of employment" email).

**Follow-ups completed earlier this session:**
- EOI auto-expire: `src/jobs/eoi-expire.ts` (daily `0 0 * * *`) + `expireUnansweredEois` in
  `eoi.service.ts` (7 days after `sentAt`, `eoi_expired` audit, frees `pendingKey`).
- Nudge windows tightened 7/14 → **3/5 days** (`NUDGE_WINDOWS_MS`).
- Verification payment: editable M-Pesa number (`pay-verification.tsx` + `payment.ts`),
  defaulting to the profile phone, **not** persisted back to `profile.phone`.
- Reverification made **replace-only**: `vault.service.ts` `deleteVaultDocument` refuses
  deletion of a `verified` profile's document; `Remove` button hidden while verified.

## Decisions made

- **Review gate = unlock + a hire that reached `agreed` or `ended`** (never
  `pending_agreement` or `reversed`). Rejection is terminal (one review per pair, ever).
- **Either party can end a contract**; the **review is mwajiri-only** for now.
- **Worker show/hide** on each published review; hidden reviews are excluded from the public
  list *and* the aggregate. Reviewer attribution is a first-name + last-initial snapshot.
- Payment phone is **not** written back to the worker's profile (payer may differ from the
  worker); the mwajiri flow persists it because there the payer is always the mwajiri.

## Problems solved

- Hired wajakazi drop out of the directory (`DIRECTORY_VISIBLE` = verified **and**
  available), so the browse detail could not host the review form for them → solved with the
  "End contract → review" flow on the "Your hires" list.
- Mongoose duplicate-index warning (field `index: true` + same field in the `indexes` array)
  → removed the duplicate.
- Component name collision (two `ReviewForm`s) → renamed the mwajiri one to
  `LeaveReviewForm`.

## Current state

- **All committed** and manually verified by Michael. `pnpm lint` 0/0, `pnpm build` green
  (only the known Windows `sharp`/`detect-libc` `EPERM` symlink warnings).
- `progress-tracker.md`, `build-plan.md`, `architecture.md`, `ui-registry.md` are current
  (manual-verification notes marked done).

## Next session starts with

- **Phase 10 — Admin & Moderation**: 10.1 suspend, reinstate, delete, blacklist per the
  authority matrix in `architecture.md` (also resolves the carried-forward `getContact`
  returns-a-blacklisted-contact gap).

## Open questions

- `hire_ended` PostHog event intentionally **not** added (not in the fixed event list in
  `code-standards.md` — add it there first if wanted).
- Carried forward, still unresolved: Phase 5 deferred manual sandbox verification (STK push,
  callback replay idempotency, subscription expiry); pre-expiry verification reminder email
  (12.1); "Extend" button in the subscription status card still uses the outline variant.
