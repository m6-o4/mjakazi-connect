# Memory — Phase 4.2 Payment Callback Handling

Last updated: 2026-09-01 14:35

## What was built

- `src/app/(payload)/api/webhooks/payments/callback/route.ts` (new) — the Daraja
  STK callback webhook. Parses the body, delegates to the service, and returns
  200 to every outcome so Daraja never retries a settled payment.
- `src/lib/mpesa.ts` — added a zod schema + `parseStkCallback()` +
  `getCallbackMetadataValue()` and the `StkCallback` type (Daraja callback
  shape).
- `src/services/payment.service.ts` — added `handleCallback()` and
  `settleCallback()`: find by `checkoutRequestId`, verify merchant correlation
  (`MerchantRequestID`), amount and phone, then compare-and-swap to `confirmed`
  or `failed`, storing the raw payload and writing the audit entry.
- `src/lib/audit.ts` + `src/payload/collections/audit-logs/schema.ts` — new
  `payment_duplicate` audit action. `src/payload-types.ts` regenerated.

## Decisions made

- Duplicate and unverifiable callbacks are refused and audit-logged via a new
  `payment_duplicate` action; nothing ever activates twice.
- `MpesaReceiptNumber` is captured into the `payment_confirmed` audit metadata
  only — no dedicated schema field (resolves the 4.1 open question for now).
- **Testing is deferred when the interface doesn't exist yet.** No throwaway test
  scripts, no "pending manual verification" against an unreachable route/UI. Trust
  completed work; fix failures only when they surface.
- **Cron/scheduled work uses Payload's job queue, not Inngest** (confirmed again
  this session).

## Problems solved

- `pnpm` is blocked by PowerShell execution policy in this shell — use
  `pnpm.cmd` for all scripts.
- The `scripts/mpesa-initiate.ts` verifier from 4.1 is already deleted (no
  `scripts/` dir exists); removed stale references to it from progress-tracker.

## Current state

- Phase 4.1 + 4.2 code-complete. `pnpm lint` (0 errors, 1 pre-existing
  `pages/schema.ts` warning) and `pnpm build` green; `/api/webhooks/payments/callback`
  is registered.
- Payment state machine: `initiated` → `stk_sent` → (`confirmed` | `failed`).
  No domain transition yet — that is 4.4 / 5.2.
- No server-side PostHog (`posthog-node` not installed); `payment_*` analytics
  fire client-side with the purchase UI in later phases.

## Next session starts with

Phase 4.3 — `jobs/payment-timeout.ts`, a Payload queue task moving `stk_sent` to
`expired` after the timeout window, registered in `payload.config.ts` `jobs.tasks`.
Then 4.4 (wire `payment.confirmed` → verification `pending_review`).

## Open questions

- `platform-settings` global (tier prices + verification fee) is not built until
  Phase 10.3 — services take `amount` as a parameter, never hardcode a price.
