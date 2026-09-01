# Memory — Phase 4.4 (verification payment) + Phase 10.3 admin settings

Last updated: 2026-09-01 21:29

## What was built

Phase 4.4 (extended) — verification payment end to end:
- `platform-settings` global with `verificationFee` (default 1500), later extended
  with a `subscriptionTiers` array (`tierId`, `name`, `price`, `durationDays`,
  `description`, `isActive`, `isConcierge`).
- `src/services/settings.service.ts` — `getVerificationFee`,
  `updateVerificationFee`, `updateSubscriptionTiers` (validates required fields,
  unique `tierId`, price/duration >= 1; PUT-replaces the array).
- `src/app/actions/payment.ts` — `initiateVerificationPaymentAction` (Server
  Action: fee from settings, phone from profile, calls existing `initiatePayment`).
- `src/components/dashboard/mjakazi/verification/pay-verification.tsx` — "Pay"
  button + STK-push confirmation polling (`router.refresh` every 5s, ~2.5min cap).
- Wire-up: `payment.service.handleCallback` calls `activateVerificationOnPayment`
  (new, in `verification.service`) after a confirmed verification callback →
  `pending_payment → pending_review`, stores `lastVerificationPaymentId`, resets
  attempts. `advanceToReview` now takes an optional `paymentId`.
- Document lock: `vault.service` refuses upload/delete while `pending_review`.
- `payment_activation_failed` audit action (lib/audit.ts + audit-logs schema).
- Server-side PostHog: `src/lib/posthog-server.ts` (posthog-node, `flushAt:1`,
  `flushInterval:0`) — `payment_completed` on confirmed callback, `payment_failed`
  on rejection/timeout; `capturePaymentEvent` resolves `users.clerkId` as
  `distinctId`.

Phase 10.3 (partial) — admin pricing UI:
- `/dashboard/admin/settings` page + "Settings" nav item; two forms
  (`PlatformSettingsForm` for fee, `SubscriptionTiersForm` for tiers) writing via
  `src/app/actions/settings.ts`.

Docs updated: progress-tracker, ui-registry, build-plan (4.4 + 10.3), architecture
(env var fix), library-docs (PostHog distinctId rule).

## Decisions made

- **4.4 scope**: verification payment *initiation* (pay button + action) was pulled
  forward into 4.4 (out of 5.2). Fee sourced from `platform-settings` (invariant
  #12); initiate is a Server Action, not a route handler.
- **Activation failure**: payment stays `confirmed` (immutable); log + write
  `payment_activation_failed` audit; no admin alert/retry in 4.4.
- **PostHog identity**: server events use the Clerk id as `distinctId` (resolved
  from `users.clerkId`), not the Payload object id — otherwise they don't join the
  browser-identified person. `payment_initiated` stays client-side; completed/
  failed are server-side.
- **10.3 tiers**: start empty (v1), form has a Remove button + Active checkbox
  (diverges from the build-plan's "deactivated, never deleted" — the safety is the
  "never change tierId after go-live" copy). `isConcierge` flag added per spec.

## Problems solved

- posthog-node v5 API: `new PostHog(token, { host, flushAt, flushInterval })` +
  `client.capture({ distinctId, event, properties })`.
- Payload array `interfaceName` names the ARRAY type (e.g. `SubscriptionTier` =
  `{...}[] | null`), not the item — removed it and use inline typing instead.
- posthog-node v5 engines require Node >=20.20/22.22 — installed fine.

## Current state

- **Phase 4 code-complete** (4.1–4.4). `pnpm lint` (0 errors, 2 pre-existing
  warnings) and `pnpm build` green.
- **Phase 10.3 partial**: admin settings UI done; the "Done when" also needs the
  mwajiri pricing page (6.x) to read tiers at runtime — not built. Tiers are not
  yet consumed by any flow (subscription purchase is 5.2).
- **All manual sandbox verification deferred** (developer will test later, once a
  UI is available): pay fee end-to-end, replay callback (no double-apply), document
  lock, PostHog events landing on one person, admin fee/tier edits persisting.

## Next session starts with

Phase 5 (Subscriptions): 5.1 `subscriptions` collection (`subscriptionState`,
`tierId`/`tierName` string snapshots from `platform-settings`, `lastPaymentId`);
5.2 purchase flow (tier selection, initiate, status polling, `payment.confirmed` →
activation); 5.3 `jobs/subscription-expiry.ts` hourly task. Re-check
`context/build-plan.md` 5.x and `context/progress-tracker.md` before starting.

## Open questions

- Manual end-to-end testing (Phase 4 + 10.3) is outstanding and scheduled by the
  developer later.
