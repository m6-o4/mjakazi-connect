# Memory — Phase 5 (Subscriptions) complete

Last updated: 2026-09-02 04:08

## What was built

Phase 5.2 — subscription purchase flow (this session built it; 5.1 was already done):

- `/dashboard/mwajiri/subscription` page + new `src/app/(saas)/dashboard/mwajiri/layout.tsx`
  role guard (mirrors the mjakazi layout). Added "Subscription" nav item in
  `src/lib/dashboard-nav.ts`.
- `src/app/actions/subscription.ts` — `initiateSubscriptionPaymentAction({ tierId, phone })`:
  zod-validates, resolves tier + price server-side, normalizes phone, persists phone,
  `beginPurchase`, then `initiatePayment` with `paymentType: "subscription"`.
- `src/components/dashboard/mwajiri/subscription/purchase-subscription.tsx` — client
  component: tier cards, M-Pesa phone input, pay/awaiting/timeout polling via
  `router.refresh()`; fires `plan_selected` + `payment_initiated` PostHog events.
- `src/services/payment.service.ts` — wired `activateSubscriptionOnPayment` into
  `handleCallback` (subscription branch, `payment_activation_failed` audit on failure).
- `src/services/profile.service.ts` — `getOwnWaajiriProfile`, `updateWaajiriPhone`.
- `src/services/subscription.service.ts` — exported `getOwnSubscription`.

Phase 5.3 — subscription expiry job:

- `src/jobs/subscription-expiry.ts` (hourly `0 * * * *`) + `expireExpiredSubscriptions` in
  `subscription.service.ts` (polls active past `tierExpiry`, expires idempotently via the
  5.1 `expireSubscription` transition). Registered in `src/payload.config.ts` `jobs.tasks`.

## Decisions made

- **Phone source**: the mwajiri has no profile form, so the purchase page collects the
  M-Pesa phone (normalized `254…`), persisted best-effort to `waajiri-profiles.phone` for
  future prefills. A failed phone save never blocks the payment.
- **Trust boundary**: the client sends only `tierId` + `phone`; price and duration are
  resolved server-side from `platform-settings` (invariant #12). Stacking (active → extend)
  reuses the 5.1 `activateSubscriptionOnPayment`.
- **5.3 scope**: "block new reveals" is NOT in 5.3 — that is `contact.service` (6.4) keying
  on `subscriptionState === "active"`; existing unlocks stay visible by design. Expiry email
  deferred to 12.1.

## Problems solved

- eslint `react-hooks/set-state-in-effect` rejected a `setStatus` reset inside a `useEffect`.
  Replaced with a derived `awaiting = status === "awaiting" && state !== "active"`; the
  polling effect keys on `awaiting`, so the callback flipping state to `active` stops
  polling without an effect body setState.
- Windows PowerShell blocks `pnpm.ps1` (execution policy). Use `pnpm.cmd` for every pnpm
  command in this repo.

## Current state

- **Phase 5 complete** (5.1 subscriptions collection/state machine, 5.2 purchase flow, 5.3
  expiry job). Phase 4 complete. Phase 10.3 partial (admin pricing UI done; the mwajiri
  pricing page that reads tiers at runtime is Phase 6.x).
- `pnpm lint` 0 errors (3 warnings: 2 pre-existing + the `TaskConfig<any>` warning that
  matches `payment-timeout.ts`), `pnpm build` green.
- **All manual sandbox verification deferred** to a dedicated session: the developer wants
  to finish the wajakazi-side tests first and will run the payment/expiry checks separately.

## Next session starts with

Phase 6 (Directory + Contact Vault), starting at 6.1 — the public `/directory` +
`/directory/[slug]` with filters and an explicit `select` omitting contact fields. Run
`/architect` first (large phase touching marketing + the vault). Re-check
`context/build-plan.md` 6.x and `context/progress-tracker.md` before starting.

## Open questions

- Manual end-to-end verification is outstanding and deferred to separate session(s): sandbox
  STK push (verification + subscription), callback replay idempotency, document lock,
  PostHog events on one person, admin fee/tier edits, and the 5.3 expiry job.
