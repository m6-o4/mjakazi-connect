# Memory — Phase 4.1 Payments Collection + M-Pesa Client

Last updated: 2026-09-01

## What was built

- `src/payload/collections/payments/schema.ts` (new) — sealed collection
  (create/update/delete `isRestricted`, read `isAdminOrOwner("user")`), full
  `architecture.md` field set. Registered in `collections/index.ts`.
- `src/lib/mpesa.ts` (new) — server-only Daraja STK client: base-URL resolution
  by `MPESA_ENVIRONMENT`, Africa/Nairobi timestamp, password generation, cached
  OAuth token, `initiateStkPush()`.
- `src/services/payment.service.ts` (new) — `initiatePayment()`: mints a 12-char
  reference, creates the `initiated` record, sends the push, lands at `stk_sent`
  (accepted) or `failed` (rejected), writes `payment_initiated`/`payment_failed`
  audit entries.
- `scripts/mpesa-initiate.ts` (new, throwaway) — CLI verifier; delete after
  manual verification.

## Decisions made

- `mpesaReference` = our minted 12-char unique business reference (fits Daraja's
  `AccountReference` 12-char cap), generated with `node:crypto` `randomInt` (no
  modulo bias), passed as `AccountReference`.
- `checkoutRequestId` = Daraja's per-push id — the Phase 4.2 callback
  matching/idempotency key (Daraja does NOT echo `AccountReference` back).
- Phone normalization reuses `normalizeKenyanPhone` from `lib/phone.ts` (single
  source of truth) — the "normalize in lib/mpesa.ts" note predates `phone.ts`.
- The initiate route (`/api/actions/payments/initiate`) is deliberately deferred
  to Phase 5.2; 4.1 has no HTTP caller.

## Problems solved

- `pnpm` is blocked by PowerShell execution policy in this shell — use
  `pnpm.cmd` for all scripts.
- Scratch script hit the service's role guard ("Forbidden") because it defaulted
  `paymentType: "verification"`; fixed by inferring the payment type from the
  account's role (mjakazi → verification, mwajiri → subscription).

## Current state

- Phase 4.1 built; `pnpm lint` (0 errors) + `pnpm build` green.
- Sandbox STK push accepted: a `subscription` payment reached `stk_sent` with
  `merchantRequestId` + `checkoutRequestId` populated and the phone normalized
  to `254…`.
- The callback route (`/api/webhooks/payments/callback`) does not exist yet — a
  404 from Daraja after the handset prompt is expected until 4.2.
- `scripts/mpesa-initiate.ts` still present; delete once the handset prompt is
  confirmed.
- No server-side PostHog (`posthog-node` not installed); `payment_initiated` /
  `payment_failed` will fire client-side with the purchase UI in later phases.

## Next session starts with

Phase 4.2 — Callback handling. Build
`src/app/(payload)/api/webhooks/payments/callback/route.ts`: verify amount,
phone, merchant credentials and transaction-id (`checkoutRequestId`) uniqueness,
store the raw payload, confirm or fail, reject duplicates (audit-logged). No
domain transition yet. Then 4.3 (`jobs/payment-timeout.ts`), then 4.4 (wire
payment → `pending_review`).

## Open questions

- `platform-settings` global (tier prices + verification fee) is not built until
  Phase 10.3 — the service takes `amount` as a parameter, never hardcodes a
  price.
- In 4.2, decide whether to also surface the actual `MpesaReceiptNumber` from
  the callback (distinct from our minted `mpesaReference`) for staff display.
