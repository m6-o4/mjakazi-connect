# Memory — Mjakazi verification + M-Pesa journey signed off; mwajiri subscription is next

Last updated: 2026-09-15 05:25 UTC

## What was built

**No domain logic changed this session.** A manual validation of the mjakazi verification
and payment journey was run, then three pieces of feedback from it were built and a review
pass was completed.

- `src/components/dashboard/mjakazi/verification/submit-verification.tsx` — the submit
  toast no longer claims review has begun. It was `"Submitted for review"` /
  `"Our team will review your profile and documents."`, fired at the moment the action
  moves `draft → pending_payment`. It now reads `"Profile submitted"` /
  `"Pay the verification fee to send your profile to our team for review."`
- `src/components/dashboard/mjakazi/verification/verification-payment-flow.tsx` — fires
  `notifySuccess("Payment received")` (`id: "verification-payment-received"`) on the live
  transition out of `pending_payment` while a payment was awaiting confirmation, alongside
  the existing inline `PaymentSuccessNotice`.
- `src/components/dashboard/mwajiri/subscription/purchase-subscription.tsx` — the same
  toast (`id: "subscription-payment-received"`) when the newest payment, matched by id,
  settles at `confirmed`.
- `src/components/dashboard/mjakazi/document-vault/index.tsx` — exports
  `DocumentNextStep = { href, label, description }`; takes `nextStep?`; renders a "All
  required documents uploaded" panel with the step's description and a
  `buttonVariants()`-styled `Link` whenever the live set is complete and a `nextStep`
  exists; fires a `"Documents complete"` toast naming that step on the same transition as
  `documents_uploaded`. The `documents_uploaded` capture and the toast now run in a
  `useEffect` keyed on `docs` instead of inside the `setDocs` updater, and the updater is
  back to a pure merge.
- `src/app/(saas)/dashboard/mjakazi/documents/page.tsx` —
  `NEXT_STEP_BY_VERIFICATION_STATE` (`draft` → Submit for verification, `pending_payment`
  → Pay the verification fee, `rejected` → Resubmit for review), `PROFILE_GATED_STATES`,
  `INCOMPLETE_PROFILE_NEXT_STEP` (→ `/dashboard/mjakazi/profile`) and
  `getNextStep(state, profileComplete)`. The panel itself moved into `DocumentVault`; the
  page only resolves the step.
- Docs: `context/progress-tracker.md` (full entry + review fixes + copy fix + the sign-off
  and next-session note), `context/ui-registry.md` (`DocumentVault`,
  `VerificationPaymentFlow`, `PurchaseSubscription`, `SubmitVerification`),
  `context/library-docs.md` (the payment-confirmation dual-cue convention and the React
  state-updater trap).

## Decisions made

- **A payment confirmation gets both cues.** The inline `PaymentSuccessNotice` is the
  persistent record; a `notifySuccess` toast is the immediate cue on the live transition.
  Both pay flows do this, each with a stable `id` so a repeat upserts.
- **A toast describes the transition that just happened and the step it leaves outstanding
  — never the end of the journey.** `draft → pending_payment` confirms the submission and
  names the fee; `"under review"` is only true at `pending_payment → pending_review`. This
  is now recorded in `library-docs.md` and the progress tracker.
- **The next-step cue is resolved from the verification state on the server, but
  completeness is decided on the client.** The server render that supplies `nextStep`
  happens before the upload that completes the set, so it must not be gated on the server
  document list — `isDocumentSetComplete(docs)` gates it inside `DocumentVault`. The panel
  lives in the same client component so it appears without a reload.
- **`submit` / `resubmit` are only offered once the profile is complete**, because
  entering review runs through the readiness rule (`SubmitVerification` disables submit
  otherwise). While the profile is incomplete, the profile is the next step.
- **`ResubmitVerification`'s `"Resubmitted for review"` toast is correct and stays** — a
  resubmission goes straight to `pending_review` with no fee.
- **No new audit action and no new PostHog event.** `documents_uploaded` keeps its
  meaning.

## Problems solved

- **The next-step cue was inert.** Both the panel and the toast label were derived from
  the server-rendered document list, which by definition predates the upload that
  completes the set — so `nextStep` was always `null` at the transition, the toast only
  ever showed its generic line, and the panel needed a reload that made the cue pointless.
  Fixed by deriving both from the live client `docs` list. Found by the review, not by me.
- **The cue overpromised for an incomplete profile.** A `draft` worker with all three
  slots but an incomplete profile was told to submit, then blocked by the disabled button.
  `getNextStep` now returns "Complete your profile" for `draft`/`rejected` while
  `profileComplete !== true`.
- **The `"Submitted for review"` toast fired before the fee.** It invited the worker to
  think the next step was unnecessary, exactly as Michael said. Reworded to drive to the
  fee; the review message now lives only where it is true.
- **`documents_uploaded` fired twice on the third upload.** A side effect inside the
  `setDocs` updater, which React double-invokes in development. Moved to an effect and
  recorded as a trap in `library-docs.md`.
- **`next build` rewrites generated files in Payload's own unformatted style.**
  `src/payload-types.ts` and `src/app/(payload)/admin/importMap.js` come back with single
  quotes and different import order, producing a ~4,370-line phantom diff that wipes the
  repo's prettier formatting. Run prettier on those two after a build, before committing.
  They are clean in the working tree right now.
- **The old `pending_payment` dead-end question is answered — no code change needed.** The
  pay card re-renders whenever the state is `pending_payment`, and after the 150s poll
  timeout the button returns, so a fresh STK push can always be started.
  `expireTimedOutPayments` expires only the payment record and the profile stays
  `pending_payment` by design.

## Current state

- **Michael tested the workflows and reports they all work as required.** This is the
  sign-off for the mjakazi verification and M-Pesa payment journey.
- `pnpm lint` 0 errors (1 pre-existing React-Compiler warning in
  `concierge-brief-form.tsx`); `pnpm build` compiles, type-checks and generates 49 pages.
  The `sharp` EPERM symlink warnings on Windows are known-harmless.
- The uncommitted set is exactly five source files — `submit-verification.tsx`,
  `verification-payment-flow.tsx`, `purchase-subscription.tsx`,
  `document-vault/index.tsx`, `documents/page.tsx` — plus four context/memory docs.
  **Nothing else is dirty.**
- This session's work is **uncommitted by design**. Michael commits after
  `/remember save`, so a dirty tree is the expected end-of-session state, not an
  outstanding item.
- `pnpm` must be invoked as `pnpm.cmd` in this shell — `pnpm` alone is blocked by the
  PowerShell execution policy.

## Next session starts with

- **The mwajiri sign-up and subscription process** — the counterpart journey to the one
  signed off today. Same shape of work: read the existing flow end to end first, then
  confirm with Michael whether this is end-to-end validation of what exists or new work,
  then `/architect` before building anything. Files to read:
  - `src/services/subscription.service.ts` — the six states, stacking logic, activation.
  - `src/components/dashboard/mwajiri/subscription/purchase-subscription.tsx` — the tier
    list, phone input, STK push and the confirmation poll (just given the payment toast).
  - `src/components/dashboard/mwajiri/subscription-status-card.tsx`.
  - `src/payload/collections/subscriptions/schema.ts` and
    `src/payload/blocks/globals/platform-settings/schema.ts` (tier prices and durations
    are read live, never hardcoded).
  - `src/jobs/subscription-expiry.ts` — hourly; an expired subscription must block new
    reveals while leaving existing unlocks intact.
  - `src/components/dashboard/mwajiri/paywall-overlay/index.tsx` and the `contact-unlocks`
    collection — the contact reveal path.
  - `context/build-plan.md` Phase 5.1–5.3 for the original acceptance criteria.
- Then the same loop: implement, `pnpm.cmd format` → `pnpm.cmd lint` → `pnpm.cmd build`,
  then `/review uncommitted`. After a build, re-run prettier on `src/payload-types.ts` and
  `src/app/(payload)/admin/importMap.js`.

## Open questions

- **`renewVerification` is still unwired** — `verification_expired → pending_payment`
  exists in `verification.service.ts` with no Server Action and no button, so the state
  card's "Renewal will be available shortly" is accurate. Deliberately out of scope today;
  an expired worker cannot currently renew.
- **Two forward-looking descriptions skip the fee** and Michael has not ruled on them:
  `SubmitVerification`'s card description ("…then submit them for our team to review") and
  the documents-page `draft` panel ("Submit your profile so our team can review your
  documents"). They instruct toward the journey's end rather than claiming review has
  started, so they were left as is.
- **Whether to add `DONE` markers to the `build-plan.md` Phase 3 and 4.4 headings**,
  matching the precedent on 10.1, 10.2 and 10.5. The file says completion is tracked in
  `progress-tracker.md`, not there, so it was left untouched.
- **Not explicitly confirmed:** that a `verified` worker uploading only the missing back
  slot keeps their badge and directory listing (the `wasVerified && previousId` fix from
  the previous session). Carried over.
- **Carried over, still unresolved:** `dateOfBirth` is identity data yet is neither
  starred nor in the completeness list; `displayName` is schema-required while
  `PROFILE_REQUIRED_FIELDS` omits it, and its helper text promises a first-name fallback
  that `toProfileData` does not implement.
- **Carried over, still unresolved:** the "public free-text must reject contact details"
  rule lives only in `code-standards.md` — promote it to a numbered invariant in
  `architecture.md`, or leave it as an implementation rule?
- If a real worker ever hits the `employer` contact-details rejection as a false positive,
  revisit the patterns in `profile-schema.ts` rather than removing the check.
