# Memory — Phase 3.3 Staff Review Queue

Last updated: 2026-09-01

## What was built

- **`services/verification.service.ts`** — added `listPendingReviews(payload,
  actor)`: `pending_review` profiles, oldest first (`sort:
  "verificationSubmittedAt"`), explicit `select`, `overrideAccess: false`.
- **`app/actions/verification.ts`** — added `approveVerificationAction(profileId,
  notes?)` and `rejectVerificationAction(profileId, reason)`. Approve takes an
  optional note (max 1000 chars via zod) passed to `approveVerification` →
  `verificationNotes`; reject requires a non-empty reason (zod) → `rejectionReason`.
- **`app/(saas)/dashboard/staff/verifications/page.tsx`** (new) — queue, admin +
  staff guard (inline, matching accounts/audit-logs pages).
- **`app/(saas)/dashboard/staff/verifications/[id]/page.tsx`** (new) — review
  case: identity summary (legal name, DOB, nationality, phone), side-by-side
  document viewer, decision form. Shows "Already resolved" when the profile is no
  longer `pending_review`.
- **`components/dashboard/staff/verifications/verification-queue.tsx`** (new) —
  presentational list + "prior rejections" badge + `Inbox` empty state.
- **`components/dashboard/staff/verifications/document-viewer.tsx`** (new) — two
  `<iframe src="/api/actions/vault/{id}">` (auth + `document_viewed` audit +
  signed-URL redirect), "Open in new tab" fallback.
- **`components/dashboard/staff/verifications/review-form.tsx`** (new, client) —
  optional "Note" textarea (approve) + required "Rejection reason" textarea
  (reject); fires `verification_approved` (`daysToVerify`) / `verification_rejected`
  (`attempt`); redirects back to the queue on success.
- **`lib/dashboard-nav.ts`** — "Verifications" item for admin + staff.

## Decisions made

- Review screen is a **separate route** `/dashboard/staff/verifications/[id]`
  (shareable, route-per-page convention), not inline on the queue.
- After approve/reject the reviewer is **redirected back to the queue**.
- Documents render through the **existing audited vault route** (iframe → signed
  URL), never by minting signed URLs server-side — keeps role check + audit entry
  in exactly one place.
- **Reject reason** (`rejectionReason`) is the mjakazi-facing "why failed"
  message, already shown on `/dashboard/mjakazi/verification` (Phase 3.2).
  **Approve note** (`verificationNotes`) is internal staff record, not shown to
  the worker.
- Both roles (admin + staff) reach the queue; guard is inline (no staff layout).

## Problems solved

- `react-hooks/purity` lint error: `Date.now()` in render flagged as impure —
  moved `daysToVerify` computation inside the approve handler.
- shadcn 4 `Button` (Base UI) has **no `asChild`** prop — use `buttonVariants({
  variant })` on a `Link` for link-styled buttons.
- **Sign-in misdirect fix**: `(auth)/sign-in/[[...sign-in]]/page.tsx` used
  `forceRedirectUrl`, which overrides Clerk's `redirect_url` (the return-to set by
  `auth.protect()`). Changed to `fallbackRedirectUrl` so users bounced from
  `/admin` return there after sign-in; direct sign-in still falls back to
  `/authenticating` → `/post-auth`. Sign-up keeps `forceRedirectUrl` (role
  promotion must always run).

## Current state

- Phase 3.3 **built and lint/build green**, but **end-to-end verification
  deferred to Phase 4.4** (payment must move `pending_payment → pending_review`
  before a real review can be exercised). Michael confirmed the staff/admin
  interface renders.
- `pnpm lint` (0 errors, 1 pre-existing `pages/schema.ts` warning) and
  `pnpm build` pass.
- Michael manually verified the `/admin` sign-in redirect fix works.

## Next session starts with

Phase 4 — Payments, isolated. Start 4.1: `payments` collection, `lib/mpesa.ts`
(OAuth, password/timestamp generation, phone normalization, STK initiation,
environment resolution), and a scratch route to prove a sandbox STK push. Do NOT
wire payment to verification until 4.4.

## Open questions

- `verified → pending_review` identity-change trigger (later phase) unresolved.
- "Fresh Certificate" renewal enforcement unresolved.
- Free-resubmit boundary `FREE_REJECTIONS = 3` (`<= 3` free / `> 3` paid)
  confirmation open.
- `blacklisted → deactivated` currently illegal (terminal) — Phase 10.1 may need
  it.
- Whether approve `verificationNotes` should also be surfaced to the worker
  (currently internal-only).
