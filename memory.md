# Memory — Off-platform referrals (a former employer vouches for a mjakazi)

Last updated: 2026-10-13 03:50 UTC

## What was built

A new, self-contained feature: a **mjakazi can invite a former employer** (someone they
worked for **before** Mjakazi Connect) to give a **private referral**, with **no
subscription and no account** for the referrer. Flow: invite → emailed one-time link →
referrer submits → **staff moderate in the SaaS dashboard** → a **public reference count**
appears on the mjakazi's profile.

New files:
- `src/lib/referral.ts` — shared note cap + policy defaults (single source for schema, zod, service).
- `src/payload/collections/referrals/schema.ts` — sealed collection; states `invited | pending | published | rejected | withdrawn | expired`; hashed `inviteTokenHash`; unique `activeKey` = `<mjakaziId>:<sha256(referrerEmail)>` (one live referral per mjakazi+employer).
- `src/services/referral.service.ts` — `inviteReferrer`, `submitReferral` (public token), `withdrawInvite`, `getReferralByToken`, `listMjakaziReferrals`, `listPendingReferrals`, `publishReferral`, `rejectReferral`, `expireStaleInvites`, `recomputeReferralCount`.
- `src/jobs/referral-expiry.ts` — daily task (registered in `src/payload.config.ts`).
- `src/app/actions/referrals.ts` — invite / submit / withdraw / publish / reject actions.
- `src/app/(saas)/dashboard/mjakazi/references/page.tsx` + `src/components/dashboard/mjakazi/references/{invite-referrer-form,referral-list}.tsx`.
- `src/app/(web)/reference/[token]/page.tsx` + `src/components/web/reference/referrer-form.tsx` — public, no session, `force-dynamic`, `noindex`.
- `src/app/(saas)/dashboard/staff/referrals/page.tsx` + `src/components/dashboard/staff/referrals/referral-queue.tsx` — staff moderation (publish / reject-with-reason).
- `src/components/reference-count.tsx` — the public cue.
- `scripts/backfill-referral-counts.ts` — idempotent, run once (see Current state).

Modified:
- `src/payload/collections/index.ts` (register).
- `src/payload/blocks/globals/platform-settings/schema.ts` — new `referralPolicy` group (inviteExpiryDays 7, resendCooldownDays 7, maxOutstandingInvites 5).
- `src/services/settings.service.ts` — `getReferralPolicy`.
- `src/lib/audit.ts` + `src/payload/collections/audit-logs/schema.ts` + `src/components/dashboard/audit-logs/audit-log-table.tsx` — six actions: `referral_invited / submitted / published / rejected / withdrawn / expired`.
- `src/lib/email.ts` — invite + published templates.
- `src/lib/dashboard-nav.ts` — **References** nav item for mjakazi, admin and staff.
- `src/payload/collections/wajakazi-profiles/schema.ts` — denormalized `referralCount` (field-locked, service-managed).
- `src/services/directory.service.ts` — `referralCount` in the public directory field set + `DirectoryProfile` type.
- `src/components/web/directory/directory-profile-detail.tsx`, `directory-card.tsx`, `src/components/dashboard/staff/wajakazi/staff-candidate-profile.tsx` — render the cue.
- `src/payload-types.ts` (regenerated).

## Decisions made

- **Referrer-initiated by the mjakazi via a one-time link; the referrer has no account and no Clerk identity.** The token is the whole capability.
- **A referral is private** (referrer + mjakazi + staff/admin only). The public surface shows **only a count of published referrals**, never the note or the employer.
- **Staff moderation is required before a referral counts** (mirrors reviews); all limits are policy-driven in `platform-settings`, never constants.
- **The cue is deliberately NOT a pill and NOT on the Verified row** — it is a plain muted text line on its own line under the rating, so it cannot read as a verification claim. (Original pill design and the "same row as Verified" variant were both tried and rejected for exactly this reason.)
- **Email only for now** (Resend), behind a `sendReferralInvite(channel, …)` boundary so SMS can be added later without reworking the flow. The referrer still needs a browser to open the link.
- **Isolation:** a referral never changes verification, directory visibility/ranking, EOI, unlocks, hires, or reviews.
- **Expiry is a terminal transition** (`invited → expired`, daily job), not just a read-time guard.
- **`referralCount` is denormalized** onto `wajakazi-profiles` (like `ratingAverage`) and recomputed on publish and on takedown.

## Problems solved

- **Token is stored hashed**, so the invite link exists only in the email — it cannot be recovered from the DB. Testing needs a real inbox or the Resend dashboard. Remember this for any future debugging of "the link doesn't work".
- **Date crash across the RSC boundary:** a Payload date can be a `Date` at runtime; the public form called `.slice()` on it. Fixed by normalising to `YYYY-MM-DD` in `getReferralByToken` (`toDateOnly`) before it reaches the client — the same guard the mjakazi profile page already used.
- **`expired` was unreachable** (expiry only returned "unavailable"), so stale invites held the `activeKey` and counted toward the cap. Added `expiredAt`, `expireStaleInvites`, the daily job, and the `referral_expired` audit action.
- **No staff removal for a published referral.** `rejectReferral` now accepts `pending` **or** `published` (a takedown) and frees the key.
- **Moderation was done in the Payload admin panel**, which is inconsistent with the rest of the product. Moved to the SaaS dashboard (`/dashboard/staff/referrals`).
- **Public referrer page was hidden behind the fixed 80px site header.** Centred the page and padded the top past the header.
- **`referralCount` did not exist when a referral was already published**, so the count showed nothing. Ran `scripts/backfill-referral-counts.ts` once (reported `updated 1 profile(s)`).
- **PowerShell:** always `pnpm.cmd` (not `pnpm`). `pnpm dev` / `pnpm.cmd build` / `pnpm.cmd exec eslint <files>` / `pnpm.cmd generate:types`.

## Current state

- The referral feature is **functionally complete**: invite → email → submit → **staff publish/reject in the SaaS dashboard** → **public reference count** on the profile (detail page, browse card, staff candidate profile). Withdraw and the re-invite cooldown work. Backfill applied.
- **`pnpm build` green; every file touched this session is ESLint-clean.** (Repo-wide `pnpm lint` still reports the pre-existing errors under the separate `.kilo/worktrees/...` worktree — unrelated.)
- **The application is now in production.** All of this session's work is **uncommitted** at the time of writing.
- No automated test framework exists — acceptance is Michael's sandbox walkthrough plus the production run.
- The reference cue styling went through three iterations; the final, intended form is a **plain text line, not a pill, not next to Verified**.

## Next session starts with

The docs pass for the referral feature (the only outstanding planned item), then move to the
next bug fix or feature. Docs to update: `context/architecture.md` (new `referrals`
collection, access, relationships, the trusted-read exemption in the invariant list),
`context/code-standards.md` (add the `referral_invited` PostHog event to the frozen list —
the client already captures it but the list may not yet reference it),
`context/build-plan.md` (new scope item), and after Michael's sign-off
`context/progress-tracker.md` + `context/ui-registry.md` (new components: invite form,
referral list, staff referral queue, reference cue).

## Open questions

- **No UI lists a *published* referral for takedown.** `rejectReferral` supports
  `published → rejected`, but the staff queue only lists `pending`, so a published
  referral cannot currently be removed from the app. Decide whether to surface it.
- **Confirm the daily `referral-expiry` job actually runs in production** — the earlier
  open item stands: nothing may be scheduling `/api/payload-jobs/run` in production, which
  would also stall expiry, EOI expiry, verification/subscription expiry and payment
  timeouts.
- `referralCount` only updates on publish/takedown. Any future path that changes the
  published set must also call `recomputeReferralCount` (or re-run the backfill script).
- Carried over and still unresolved from the previous session: `renewVerification` is
  unwired; the mwajiri pricing grid wraps 3+1 at four tiers (left as-is deliberately);
  the reconstructed `purchase-subscription.tsx` was never diffed against its pre-clobber
  copy.
