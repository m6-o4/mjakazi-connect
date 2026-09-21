# Memory — Certificate front/back, profile re-validation, and payment recovery built

Last updated: 2026-09-21 23:30 UTC

## What was built

**No domain logic changed for the certificate work beyond one row; the payment recovery
work is substantial and new.**

- `src/lib/vault.ts` — `DOCUMENT_SLOTS` now declares the Certificate of Good Conduct as
  **two required slots** (front + back), matching the National ID. The required set is
  four slots. Every consumer derives from that list, so the mjakazi upload UI, the staff
  `DocumentViewer`, the dashboard checklist, the submit checklist and
  `approveVerification`'s gate all followed with no per-screen edit.
- `src/services/vault.service.ts` — the verified-worker revert condition changed from
  `wasVerified && previousId` to **`wasVerified`**: any upload by a verified worker
  (including adding the newly-required slot) returns them to `pending_review`. The old
  "adding a slot the required set grew to include keeps your badge" exception is gone.
- `src/components/dashboard/mjakazi/document-vault/index.tsx` — takes a new `locked` prop
  (true while `pending_review`) that disables upload, replace, remove and the file inputs
  while leaving `View` live; also fires an `notifyInfo` "Document changed" toast
  (`id: "document-reverted"`) + `router.refresh()` when the upload route reports
  `reverted`, and stands the "Documents complete" toast down in that case.
- `src/app/(saas)/dashboard/mjakazi/documents/page.tsx` — a `pending_review` banner ("Your
  documents are with our team for review… cannot be changed until then"); the verified
  banner copy is now "Any change to your documents will require re-verification".
- `src/components/dashboard/mjakazi/verification-status-card/index.tsx` — the draft cue no
  longer says "Add the two documents below" over four rows.
- **Payment recovery (all new):**
  - `src/lib/mpesa.ts` — `queryStkStatus` (`/mpesa/stkpushquery/v1/query`), and the
    push-error path now reads `errorCode`/`errorMessage`.
  - `src/services/payment.service.ts` — `reconcilePayment` (staff/admin, receipt
    mandatory, `stk_sent` only, CAS, then the shared `activateConfirmedPayment`),
    `listStuckPayments`, and `reconcileTimedOutPayments` replacing
    `expireTimedOutPayments` entirely. Each payment is asked about once, tracked by
    `mpesaStatusCheckedAt`.
  - `src/app/actions/payment.ts` — `reconcilePaymentAction`.
  - `src/app/(saas)/dashboard/staff/payments/page.tsx` +
    `src/components/dashboard/staff/payments/stuck-payment-list.tsx` (new) — the staff
    list and the confirm-with-receipt dialog. New "Payments" nav item for admin and staff.
  - Schema: `payments` gained `mpesaReceiptNumber` (first-class for the first time),
    `mpesaStatusCheckedAt`, `reconciledBy`, `reconciledAt`; `audit-logs` and
    `src/lib/audit.ts` gained `payment_callback_received`, `payment_confirmation_missing`,
    `payment_reconciled`.
  - `src/jobs/payment-timeout.ts` — delegates to the sweep; no longer expires anything.
- Docs updated:
  `context/{architecture,library-docs,build-plan,ui-registry,progress-tracker}.md`.

## Decisions made

- **A confirmation always carries a receipt.** No path confirms a payment without one. The
  Express Query response can never supply the receipt (Safaricom-confirmed: six fields, no
  `MpesaReceiptNumber`), so a "paid but no callback" verdict does **not** confirm — it
  flags the payment for staff to complete from the payer's own SMS. Michael's rule: the
  receipt SMS is the only proof the money moved.
- **A payment is never written off because time passed.** At two minutes we ask M-Pesa;
  `failed` only on a definitive "did not complete". Inconclusive changes nothing.
- **Hand reconciliation is available to staff and admin** (Michael's answer), receipt
  mandatory.
- **The two-minute window stays.** Michael: v1 with Daraja 2.0 worked at 2 minutes, and
  going beyond ~3 makes the system look incompetent. The window is now when we _ask_, not
  when we give up.
- **The callback route is left exactly as it is** — always HTTP 200. Michael's explicit
  instruction; a decision follows a test round with one more mjakazi and three more
  waajiri.
- **A verified worker who changes any document goes back to review**, including adding the
  certificate back. (Reverses the previous session's additive-slot exception.)
- **A Payload `select` option addition is a type change**: add to both `src/lib/audit.ts`
  and the collection options, then `pnpm generate:types` before `pnpm build` will
  type-check. A writer whose action is missing from the options is silently rejected at
  runtime.

## Problems solved

- **The blind expiry was a money-losing rule, and it fired once for real.** Un-wedging the
  `payment-timeout` row let a tick run the _old_ code before the dev server reloaded the
  task module, expiring both historical stuck sandbox payments at 22:09 on 2026-09-21.
  Both are sandbox rows with no money moved, so nothing was lost — but it is the exact
  failure the new rule removes.
- **The wedged job was the cause of the dead timer.** A single `payload-jobs` row stamped
  `2026-09-04` with `processing: true` was blocking that task's scheduling while the other
  four tasks ticked. Clearing it produced a tick within the minute.
- **The in-process job runner is not reliable enough to assume a run per minute.**
  Observed rows are roughly hourly. Any sweep that must act in a short window has to
  self-correct on a missed run — hence the once-per-payment stamp rather than a
  time-window filter.
- **Nothing recorded that a callback arrived.** Every path answered 200 and logged only to
  the console, so "Daraja never posted" and "we received it and dropped it" were identical
  in the data — the reason the lost-callback problem was undiagnosable three times.
  `payment_callback_received` closes it; the route now reads the body with `req.text()`
  and parses by hand so an unreadable body is recorded verbatim.
- **Our push request and callback parsing match the Express docs field for field**, the
  endpoint answers 405/200 correctly, and the `CallBackURL` needs no registration
  (Michael, from the docs). The application is not the suspected cause of the missing
  callbacks.
- **`pnpm build` silently leaves generated files in Payload's raw style** — re-run
  prettier on `src/payload-types.ts` and `src/app/(payload)/admin/importMap.js` after
  every build. The running dev server also rewrites them, so they can reappear dirty at
  any time.

## Current state

- `pnpm build` passes with **50 routes** (the new staff payments page); `src` lints clean
  (0 errors, the one pre-existing React-Compiler warning in `concierge-brief-form.tsx`).
  Full `pnpm lint` also reports errors inside `.kilo/worktrees/fortune-trigonometry/` — an
  Agent Manager worktree the ESLint config does not ignore; not our code.
- The sweep was verified directly against the database on a throwaway `stk_sent` payment:
  `{"checked":1,"paid":0,"failed":0,"unresolved":1}` for a bogus checkout id, status left
  at `stk_sent`, `mpesaStatusCheckedAt` written, row deleted. The scratch script is gone.
- Michael's KSh 2 verification payment from this session was settled by hand and his
  profile is `pending_review`.
- **Uncommitted by design** — Michael commits after `/remember save`. The tree holds the
  certificate and UX work, the payment recovery build, the context docs, plus
  `payload-types.ts` (a real type change) and `CHANGELOG.md` (prettier churn on a
  generated file). Two new untracked directories:
  `src/app/(saas)/dashboard/staff/payments/` and
  `src/components/dashboard/staff/payments/`.
- `pnpm` must be invoked as `pnpm.cmd` in this shell — plain `pnpm` is blocked by the
  PowerShell execution policy.

## Next session starts with

- **A test round is running**: one more mjakazi and three more waajiri are being taken
  through the flows to see what breaks. Expect Michael to arrive with what broke rather
  than a build request. If a payment is stranded, the payer still sees the "unconfirmed,
  do not pay again" copy while staff complete it on `/dashboard/staff/payments` — that cue
  gap is the first thing to fix if he raises it.
- Likely next: **the mwajiri sign-up and subscription journey**, now directly relevant
  since three waajiri are being tested. Same shape of work as the mjakazi pass — read the
  flow end to end, confirm with Michael whether it is validation or new work, then
  `/architect` before building. Files: `src/services/subscription.service.ts`,
  `src/components/dashboard/mwajiri/subscription/purchase-subscription.tsx`,
  `subscription-status-card.tsx`, the subscriptions + platform-settings schemas,
  `src/jobs/subscription-expiry.ts`, `paywall-overlay/index.tsx` and `contact-unlocks`,
  and `context/build-plan.md` Phase 5.1–5.3.
- Loop: `pnpm.cmd format` → `lint` → `build`, then `/review uncommitted`; re-run prettier
  on the two generated files after the build.

## Open questions

- **The Cloudflare check has not been done.** Cloudflare → Security → Events for
  `/api/webhooks/payments/callback` around 2026-09-16 20:38 and 2026-09-21 18:20 is still
  the leading suspect for the lost callbacks — one payment was lost at 20:38 while another
  confirmed in twelve seconds at 21:01, same URL, same handset. Decisive either way.
- **No customer-facing cue for a payment the sweep has confirmed as paid.** The payer is
  not told we already know they paid.
- **Nothing drives `/api/payload-jobs/run` on a schedule**, and the in-process runner is
  demonstrably unreliable, so production needs an external cron using `CRON_SECRET`.
- **`renewVerification` is still unwired** (`verification_expired → pending_payment` has
  no Server Action and no button), so the state card's "Renewal will be available shortly"
  is accurate but an expired worker cannot renew.
- **A `pending_review` worker with a legacy single-sided certificate cannot add the back
  slot** (the vault locks) and `approveVerification` will refuse until staff reject them
  so they can resubmit. Accepted by Michael as "let the application take its natural
  course". No backfill.
- **Carried over, unresolved:** `dateOfBirth` is identity data yet is neither starred nor
  in the completeness list; `displayName` is schema-required while
  `PROFILE_REQUIRED_FIELDS` omits it and its helper text promises a first-name fallback
  that `toProfileData` does not implement.
- **Carried over, unresolved:** the "public free-text must reject contact details" rule
  lives only in `code-standards.md` — promote it to a numbered invariant in
  `architecture.md`?
- **Carried over, unresolved:** whether to add `DONE` markers to `build-plan.md` Phase 3
  and 4.4 headings; and two forward-looking descriptions that skip the fee
  (`SubmitVerification`'s card and the documents-page `draft` panel) that Michael has not
  ruled on.
