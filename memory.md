# Memory — Real M-Pesa callbacks in dev, payment success cues & Concierge (Phase 11)

Last updated: 2026-09-10 22:24

## What was built

Concierge (Phase 11), the Daraja 3.0 callback fix, dev/production payment parity, and
payment success cues.

**Phase 11 — Concierge (end to end)**
- `src/payload/collections/concierge-cases/schema.ts` (new) — collection with states
  (`intake`, `in_review`, `shortlist_delivered`, `closed`, `replacement_requested`),
  structured brief group, shortlist array with match notes, `assignedTo`.
- `src/services/concierge.service.ts` (new) — auto case creation on Concierge payment,
  brief submission, case claim, shortlist delivery (creates `contact-unlocks`, emails the
  mwajiri), outcome recording, 1-time replacement guarantee.
- `src/app/actions/concierge.ts` (new) — Server Actions with cache revalidation.
- Mwajiri: `concierge-brief-form.tsx`, `concierge-status-card.tsx`,
  `(saas)/dashboard/mwajiri/concierge/page.tsx`.
- Staff: `concierge-queue.tsx`, `concierge-case-detail.tsx`,
  `(saas)/dashboard/staff/concierge/page.tsx` + `[id]/page.tsx`.

**Mid-cycle subscription upgrade (Option 2, value-based proration)**
- `src/services/subscription.service.ts` — `stackSubscription` now converts the unexpired
  monetary value of the previous tier into extra days on the new tier, using the actual
  amounts on file (`payments` → `tierId` → tier price/duration). New tier takes effect
  immediately from `now()`; `tierExpiry = now() + tier.durationDays + prorated extra days`.

**Daraja 3.0 callback fix (app-wide, not concierge-specific)**
- `src/lib/mpesa.ts` — `callbackMetadataItemSchema.Value` relaxed to
  `.nullish()`; `getCallbackMetadataValue` coerces null → undefined.
- Confirmed by tracing: one shared `parseStkCallback` → one route
  (`/api/webhooks/payments/callback`) → `handleCallback` → verification **or** any
  subscription tier. There is no per-plan parser.

**Dev/production payment parity**
- Deleted the dev-only workaround: `src/app/actions/dev.ts` and
  `src/components/dashboard/dev/dev-payment-simulate.tsx` (and the `dev/` folder), removed
  both render sites. Development now settles from the real Daraja callback over the tunnel.
- `src/services/payment.service.ts` — added `getLatestPaymentForUser`.

**Payment success cues (UI)**
- `src/components/dashboard/payments/payment-success-notice.tsx` (new) — shared neutral
  card, success colour only on icon/heading.
- `src/components/dashboard/mjakazi/verification/verification-payment-flow.tsx` (new) —
  always-mounted wrapper that survives `pending_payment → pending_review` and then shows
  the notice (gated to `pending_review`).
- `pay-verification.tsx` — reports awaiting state up via `onAwaitingChange`.
- `purchase-subscription.tsx` — detects the newest payment **by id** settling at
  `confirmed` (so renewals/upgrades are caught); polling fixed to run while awaiting even
  when the subscription is already `active`.

**Records updated:** `context/architecture.md` (invariant #13 no longer has a simulator
exception; Payments section rewritten), `context/library-docs.md` (Daraja valueless
metadata item; dev uses real callbacks), `context/ui-registry.md`,
`context/progress-tracker.md`.

## Decisions made

- **No payment bypass or dev shortcut — ever.** M-Pesa is online-only. Dev uses real
  callbacks over the tunnel (`app-dev.s3.co.ke`, already in `allowedDevOrigins`); no offline
  testing path. A payment with no callback self-expires after the 2-minute timeout.
- **Proration uses amounts on file, never hardcoded values** — so test amounts (KSh 15) and
  real amounts (KSh 20,000) behave identically and correctly.
- **Concierge case creation is idempotent per open case** — reuses any non-closed case for
  the mwajiri; creates a fresh `intake` case only when none is open.
- **Success cue is anchored on payment id, not subscription state**, because an upgrade
  keeps the state `active`.

## Problems solved

- **Daraja 3.0 dropped callbacks:** `{"Name":"Balance"}` has no `Value`; the strict schema
  rejected the whole callback → `unrecognized callback body`. Fixed by making `Value`
  optional.
- **Upgrade never polled for its callback:** the subscription poll required
  `state !== "active"`, so a mid-cycle upgrade (already active) never refreshed. Now polls
  while a payment is awaiting, and stops when the newest payment confirms or on timeout.
- **Success notice lost on verification:** `PayVerification` unmounts the instant the
  callback flips the state, so detection lives in the parent wrapper instead.
- **Proration math verified** for Essentials→Concierge, Standard→Concierge, and same-tier
  renewal (renewal correctly reduces to plain stacking).

## Current state

- Phase 11 complete; dev/production payment parity complete; success cues complete.
- `pnpm lint` — 0 errors (1 pre-existing `react-hook-form` `watch()` warning in
  `concierge-brief-form.tsx`). `pnpm build` — compiles and type-checks, 47 routes; only the
  known harmless Windows `sharp`/`detect-libc` EPERM symlink warnings.
- **All work from the last two sessions is uncommitted.**

## Next session starts with

- **Waiting on Michael's client-meeting change list** (interface + workflow changes for the
  soft launch next week). He is still collating it; do not start guessing changes. When it
  arrives, group the changes, surface ambiguities, and confirm a plan before writing code.
- Then: without the test environment being wiped, implement the approved changes, verify
  (`pnpm lint` + `pnpm build`), and only then run the fresh-data manual test.

## Open questions

- The client's requested changes are unknown. Await the list.
- Remaining backlog (not blocking): staff "today's activity" + "queue preview"; mjakazi
  verification-expiry countdown.
- Known accepted gap: no distinct immediate UI cue for a cancelled/failed callback (e.g.
  ResultCode 1032) — the waiting state runs to its timeout message. Confirm if the client
  wants an immediate failure notice.

## Test plan (pending, per Michael)

Michael will wipe all records, keep only the admin account, then create **2 staff, 6
wajakazi, 3 waajiri** and simulate typical usage. Recommended sequencing agreed: land the
client changes first, then wipe-and-recreate so the soft-launch build itself is what gets
exercised. Before the wipe, confirm platform-settings values are re-entered — subscription
tier prices, verification fee, and Concierge flags are read live by several flows.
