# Memory — Phase 6.4 contact unlock complete (revenue spine done)

Last updated: 2026-09-07 02:33

## What was built

**Phase 6.4 (Contact unlock)** — the transaction the product exists to enable:
- `src/payload/collections/contact-unlocks/schema.ts` — sealed collection
  (`mwajiri → users`, `mjakazi → wajakazi-profiles`, `tierAtUnlock`, `unlockedAt`,
  `subscription → subscriptions`; compound unique on (mwajiri, mjakazi);
  create/update/delete `isRestricted`, read `isAdminOrOwner("mwajiri")`).
- `src/services/contact.service.ts` — the **only** place phone/email are read
  (`hasUnlock`, `getContact`, `revealContact`).
- `src/app/actions/contact.ts` — `revealContactAction` Server Action.
- `src/components/dashboard/mwajiri/browse/browse-contact-card.tsx` — three-state client
  component (live contact / unlock button / subscribe CTA).
- `src/app/(saas)/dashboard/mwajiri/browse/[slug]/page.tsx` — pre-fetches already-unlocked
  contact; `src/components/web/directory/directory-profile-view-tracker.tsx` gained
  `isUnlocked` prop. Added `contact_unlocked` audit action (`lib/audit.ts` +
  `audit-logs/schema.ts`). `payload-types.ts` regenerated.

**Subscription purchase emails split** — mwajiri now gets two emails on a purchase:
`sendSubscriptionReceiptEmail` (plan + amount + M-Pesa receipt) and a slimmed
`sendSubscriptionActivatedEmail` (plan + access-until), both fire-and-forget from
`subscription.service.ts` (`notifySubscriptionActivated` → `notifySubscriptionPurchase`).

## Decisions made

- `contact.service.ts` is the named **fourth** `overrideAccess` exemption to invariant #15
  (reads phone + email via trusted reads — email lives on `users`, unreadable by a mwajiri
  through access control). Documented in `architecture.md`.
- `contact-unlocks` dropped the `payment` relation (unlocks aren't tied to a payment; the
  activating payment is on `subscription.lastPaymentId` + audit metadata).
- Reveal is a Server Action, not the build-plan's literal `api/actions/contact/reveal`
  route (Server-Action-first rule).
- `revealContact` re-checks `DIRECTORY_VISIBLE`; `getContact` for an existing unlock does
  not (unlocks are permanent).
- Already-unlocked subscribers land directly on live contact (no re-reveal button).

## Problems solved

- Payload `select` type does not accept `id` — the reveal's visibility re-check uses
  `select: { slug: true }`.
- Power dip corrupted `.next` (font-module resolution failure, then a `posthog-js@1.425.1`
  "module factory is not available" runtime error). Both were stale cache, not code —
  fixed by clearing `.next` and rebuilding (`pnpm install` reported "Already up to date").

## Current state

- **Revenue spine complete and manually verified** (identity → profile → documents →
  verification → payment → review → directory → subscription → contact unlock). An active
  mwajiri can unlock a mjakazi's contact details end to end.
- `pnpm lint` 0 errors; `pnpm build` green.
- `progress-tracker.md`, `ui-registry.md`, `architecture.md`, `build-plan.md` updated.
- A broad uncommitted `pnpm-lock.yaml` dependency bump (posthog-js 1.425.1→1.427.2 +
  others) is present but reconciled.

## Next session starts with

- Phase 7.1 — verification expiry job (`jobs/verification-expiry.ts`, daily):
  `verified → verification_expired` past expiry, hide profile, email the worker. Re-check
  `context/build-plan.md` 7.1 and `context/progress-tracker.md`.

## Open questions

- Phase 5 deferred manual sandbox verification (STK push, callback replay idempotency,
  5.3 expiry job) may still be outstanding — confirm before Phase 7+.
- `getContact` returns contact even for a `blacklisted` (not deleted) profile — "permanent
  unlock" vs moderation is un-designed; blacklisting lands in Phase 10.1.
- Minor: "Extend" button in the subscription status card is still the outline variant.
