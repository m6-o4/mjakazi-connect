# Memory — Concierge v1, private reviews with a public star rating, and the hire-card rework

Last updated: 2026-09-24 04:27 UTC

## What was built

Four pieces this session, all **uncommitted** (Michael commits after `/remember save`).

**1. Concierge v1 — staff candidate view, notifications, delivery hardening.** Filled the
gap deferred from the interest-gate session. New read-only staff page
`src/app/(saas)/dashboard/staff/wajakazi/[id]/page.tsx` + `StaffCandidateProfile`
component (full profile, identity, contact, verification, plus "View documents" and "Open
full record in admin" links), linked from every candidate row in
`concierge-case-detail.tsx`. `lib/email.ts` gained `sendConciergeBriefSubmittedEmail`
(staff/admin) and `sendConciergeShortlistSharedEmail` (each shortlisted mjakazi).
`deliverConciergeShortlist` hardened: state guard (`in_review`/`replacement_requested`
only), per-candidate eligibility re-check, and grant rollback if the case write fails.
Guards added to `claimConciergeCase` (closed) and `requestConciergeReplacement` (from
`closed` only). Replacement gating moved to `hasRecentConfirmedHire` (30-day,
both-sides-agreed) instead of a hardcoded `true`. Candidate links open in the **same tab**
and carry `?caseId=` so the detail's back link is "Back to Case".

**2. `/review uncommitted` pass on concierge, then fixes.** `requestConciergeReplacement`
now requires `outcome === "hired"`; the `contact_unlocked` audit entries are written only
after the case write commits (a rolled-back delivery leaves no false audit);
`deliverConciergeShortlist` derives eligibility from the shared `DIRECTORY_VISIBLE` gate
instead of restating it; `StaffCandidateProfile` renders the shared `VERIFICATION_BADGE`
map; the brief notification sends sequentially.

**3. Reviews — private comments, public star rating, rating filter.** `reviews.comment` is
now private; `wajakazi-profiles` gained `ratingAverage` (unrounded, 2dp) and `ratingCount`
(service-managed, field-locked); `review.service.recomputeProfileRating` recomputes them on
`approveReview`. Removed the public comment list (`ProfileReviews` + `getPublicReviews`)
and the worker hide control (`setReviewVisibility`, its action, the panel toggle,
`hiddenByWorker`). The star renders near the top of `DirectoryProfileDetail`, on
`DirectoryCard`, and on `StaffCandidateProfile`. Directory filter `minRating` →
`ratingAverage >= minRating` (unrated excluded) via a "4+ / 3+ / 2+ stars" select in
`DirectoryFilterBar`, preserved through pagination; applies to the public directory and the
mwajiri browse. Types regenerated.

**4. Hire-card rework.** `hire.service.ts` candidate lists now exclude
`pending_agreement | agreed | ended` (only a `reversed` hire frees a pair), and
`confirmHireCore` treats `ended` as terminal. `hire-confirm-card.tsx` is now three
sections — Ready to hire / Active hires / Past hires — with one affordance per state and an
inline confirm on "Record hire".

## Decisions made

- **Concierge keeps the direct contact grant** as a deliberate staff-run exception to the
  interest gate; the shortlisted worker is **notified**, not asked. Recorded in
  `architecture.md`.
- **Review comments are private** to the worker, the author, and staff/admin — never
  public. **Every published review counts** toward the average (the hide control is gone,
  so a low rating cannot be excluded). The star shows from the **first** published review.
- **Rating is denormalized onto the profile** (`ratingAverage`/`ratingCount`) so the
  profile star is a field read and the filter is a normal query, instead of an aggregation
  per request.
- **No sort-by-rating** — filtering was the requirement.
- **Concierge candidate links open in the same tab**; the shortlist builder draft is not
  persisted (see Problems solved), so leaving a partly-built shortlist resets it.
- **A completed (`ended`) hire is terminal for the pair.** Re-recording requires a
  `reversed` hire.

## Problems solved

- **`contact_unlocked` audit written before the case write** in concierge delivery — moved
  after the commit so a rollback leaves no audit claiming a shared contact.
- **`confirmHireCore` infinite retry loop.** An `ended` hire fell through to the create
  branch, the unique `(mwajiri, mjakazi)` index rejected it, and the catch re-invoked the
  function — an unbounded loop that also set `availabilityStatus` to `hired`. Fixed with an
  `ended` guard plus excluding `ended` from the candidate lists. This was the cause of the
  "Mark as hired" button showing for an already-completed, reviewed hire.
- **React Compiler lint rejects `setState` in an effect**, and a lazy `sessionStorage` read
  breaks hydration. The concierge shortlist-draft persistence was dropped rather than
  build a small external store.
- **PowerShell blocks `pnpm.ps1`** — always use `pnpm.cmd`.
- **`src/scripts/backfill-profile-ratings.ts` was deleted** on Michael's instruction — the
  project is in development, so no backfill is needed. (A backfill would only be needed at
  a production cutover that already had published reviews.)
- Repo-wide `pnpm lint` still reports **9 pre-existing errors under
  `.kilo/worktrees/fortune-trigonometry/design/codebase`** (a separate worktree) — unrelated
  to this work; the changed files lint clean.

## Current state

- `pnpm build` green; all changed files lint clean. `src/app/(payload)/admin/importMap.js`
  was regenerated by the type-generation step.
- No DB migration or data backfill needed (development; no reviews to migrate).
- Docs updated: `architecture.md`, `ui-registry.md`, `progress-tracker.md`.
- Prior interest-gate work is **committed**; everything from this session is **uncommitted**.
- Known trade-off: navigating from the shortlist builder to a candidate profile and back
  resets the in-progress selection.

## Next session starts with

**Subscriptions: implement and test the ability to upgrade.** Read
`src/services/subscription.service.ts` (purchase / renew / stack / activation and the
`createConciergeCaseOnPayment` side effect), `mwajiri/subscription/page.tsx` and the
subscription components, the subscription-tier settings in the Platform Settings global,
and the M-Pesa payment confirmation path. Decide the upgrade semantics (below) with Michael,
then build and test the flow end to end.

## Open questions

- **Upgrade semantics**: does an upgrade replace the current tier immediately, pro-rate, or
  apply at renewal? Is the expiry reset, extended, or preserved? Is the old tier refunded?
- **Does an upgrade re-trigger the concierge case side effect** when moving onto a concierge
  tier, and does it behave on the `active → active` stack path? This was never confirmed
  live.
- **Concierge, deliberately out of scope this pass**: an in-app "who has my contact" view,
  and a worker opt-out.
- Carried over from the prior session: check Cloudflare Security Events for lost M-Pesa
  callbacks; no payer cue for a sweep-confirmed payment; nothing schedules
  `/api/payload-jobs/run` in production; `renewVerification` is unwired; several small
  data-model inconsistencies.
