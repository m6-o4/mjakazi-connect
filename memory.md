# Memory — Document vault: National ID front and back

Last updated: 2026-09-15 03:22 UTC

## What was built

**The vault moved from one file per document type to one file per slot** — a (document
type, side) pair. The National ID is now captured as front and back, the Certificate of
Good Conduct keeps a single slot, and all three are required before a worker can submit
for verification.

- `src/lib/vault.ts` — the whole slot model: `DOCUMENT_SLOTS` (type → label, description,
  sides, `required`), `DOCUMENT_TYPE_OPTIONS` / `DOCUMENT_SIDE_SELECT_OPTIONS` derived
  from it, `documentTypeSchema` / `documentSideSchema`, `documentSideLabel`,
  `documentSlotLabel`, `normalizeDocumentSide`, `documentSlotKey`, `documentSlotWhere`,
  `isDocumentSlot`, `REQUIRED_DOCUMENT_SLOTS`, `getMissingDocumentSlots`,
  `isDocumentSetComplete`, plus the existing `VAULT_MAX_BYTES` / `VAULT_MIME_TYPES`.
- `src/payload/collections/vault-documents/schema.ts` — required `side` select
  (`defaultValue: "front"`), added to `defaultColumns`. `pnpm generate:types` run.
- `src/services/vault.service.ts` — `uploadVaultDocument` takes and validates `side`,
  checks the pair against `DOCUMENT_SLOTS`, and finds/replaces by slot; all three audit
  actions (`document_uploaded`, `document_viewed`, `document_deleted`) carry `side`.
- `src/app/(payload)/api/actions/vault/route.ts` — parses, validates and forwards `side`,
  rejects an invalid pair, returns `side` in the document payload.
- `src/services/verification.service.ts` — `getMissingRequiredDocuments` (explicit
  `select` + `depth: 0`) replaces the old two-document boolean; `assessReadiness` uses it,
  and **`approveVerification` re-checks it before granting `verified`**.
- `src/components/dashboard/mjakazi/document-vault/index.tsx` — one card per document with
  a slot per side; per-slot upload/replace/remove/view, per-slot errors,
  `documents_uploaded` fired once when every required slot is present.
- `src/app/(saas)/dashboard/mjakazi/documents/page.tsx`,
  `.../mjakazi/verification/page.tsx`, `.../mjakazi/page.tsx` — pass `side`, and the
  readiness checklist is the required-slot set.
- `src/components/dashboard/mjakazi/verification/submit-verification.tsx` — prop is now
  `missingDocuments: string[]`; one checklist row per missing slot.
- `src/components/dashboard/staff/verifications/document-viewer.tsx` and
  `src/app/(saas)/dashboard/staff/verifications/[id]/page.tsx` — every side renders, front
  and back side by side inside the document's card, "N of M uploaded".
- Docs: `context/architecture.md` (Documents schema + `side`, per-slot locking, the
  badge-boundary rule), `context/project-overview.md`, `context/build-plan.md` (2.2 scope
  addition), `context/progress-tracker.md` (full entry + a review-fixes section),
  `context/ui-registry.md` (`DocumentVault`, `DocumentViewer`, `SubmitVerification`,
  `VerificationStatusCard`), `context/library-docs.md` (the select-`defaultValue` backfill
  trap).

**Review pass**: `/review uncommitted` with all six tracks. Eight findings, all fixed —
see Problems solved for what each one was.

## Decisions made

- **A `side` field, not a document type per side.** Type says what the document is, side
  says which face; a slot is the unit uploaded, replaced, removed and checked. Adding a
  side later is a row in `DOCUMENT_SLOTS`, not a new enum value.
- **Required set**: National ID front + back + Certificate of Good Conduct. The
  certificate stays single-sided because that is how it is issued. All three required.
- **`DOCUMENT_SLOTS` is the single source of truth.** The collection options, the upload
  UI, the staff viewer, the dashboard checklist and the submit gate all read it, and they
  share `documentSlotKey` so they cannot disagree about which slot a record occupies.
- **No new audit action and no new PostHog event.** `documents_uploaded` keeps its meaning
  — "the document set is complete" — now over three slots. Audit metadata gained `side`.
- **Storage and delivery untouched.** Same bucket, same `signedDownloads`, same 5MB/MIME
  limits, same audited `/api/actions/vault/{id}` route.
- **A record stored before `side` existed reads as the front** (`normalizeDocumentSide`),
  and the replace lookup matches it with `{ side: { exists: false } }` so a legacy upload
  is replaced rather than orphaned.
- **An additive upload does not revert a verified worker.** Only an actual overwrite does
  (`wasVerified && previousId`). See Problems solved.
- **The badge boundary is the enforced one, not the review entry.** `approveVerification`
  re-checks the required set. Deliberately _not_ locking edits during `pending_payment`
  and _not_ failing inside `advanceToReview`, because a refused transition leaves a worker
  who has already paid with no way back to `draft` (see Open questions).

## Problems solved

- **Adding a required slot to a live collection makes every existing verified worker's set
  incomplete.** Their National ID has no `side` (reads as front) and no back, so the vault
  UI shows an empty back slot and invites them to fill it. The original revert rule
  (`wasVerified` alone) was only equivalent to "replaced a document" while both documents
  were required slots — so filling that slot would have cost them the badge, their
  directory listing and a locked vault. Now gated on `wasVerified && previousId`.
- **The two enums are flat, so the pair was unvalidated.** A POST with
  `certificate_of_good_conduct` + `back` passed both checks and was persisted — a document
  no UI enumerates and the gate ignores. `isDocumentSlot` now rejects any pair that is not
  in `DOCUMENT_SLOTS`, in the route and the service.
- **The submit gate could be undone.** The gate runs on entry to `pending_payment`, but
  the vault stays editable until `pending_review` (`uploadVaultDocument` and
  `deleteVaultDocument` lock only `pending_review`, with `verified` additionally requiring
  replacement over removal), and `advanceToReview`/`approveVerification` re-checked
  nothing. So a worker could pass the gate, drop a required slot, pay, and be approved on
  incomplete evidence. Fixed at approval. **Rejected alternative:** re-checking inside
  `advanceToReview` or locking `pending_payment` — the payment path never rolls back and
  `TRANSITIONS.pending_payment` has no route to `draft`, so a refused activation strands a
  paid worker.
- **The front/back rule had two definitions.** The replace query encoded it inline while
  `normalizeDocumentSide` owned it. Now `documentSlotWhere` derives the constraint from
  the same normalization.
- **Slot identity was re-implemented three times** (a local `slotKey` in the component
  plus inline template literals in the dashboard page). Now one `documentSlotKey`, which
  normalizes internally.
- **Stale-closure state merge.** The upload handler computed its next list from a captured
  `docs`, so two slots uploaded in quick succession could drop each other (and fire
  `documents_uploaded` early). Now a functional `setDocs` update.
- **Payload `select` `defaultValue` does not backfill existing documents** — recorded in
  `context/library-docs.md` with the `exists: false` matching pattern.
- **`pnpm format` also reformatted 15 untouched files** (prettier drift that predated this
  session). Michael chose to keep it; it is recorded in the progress-tracker entry.

## Current state

- Built, reviewed and fixed. `pnpm lint` 0 errors (1 pre-existing React-Compiler warning
  in `concierge-brief-form.tsx`); `pnpm build` compiles, type-checks and generates 49
  pages. The `sharp` EPERM symlink warnings on Windows are known-harmless.
- **Michael has verified the upload of each slot and the invocation of the next step** —
  "This works well." The vault UI, the per-slot upload and the submit transition are
  confirmed working.
- **One check deferred by Michael to a later step:** a verified worker uploading only the
  back keeps their badge and directory listing (the fix for the add-vs-replace revert).
- `pnpm` must be invoked as `pnpm.cmd` in this shell — `pnpm` alone is blocked by the
  PowerShell execution policy.
- This session's work is **uncommitted by design**. Michael commits after
  `/remember save`, so a dirty tree is the expected end-of-session state, not an
  outstanding item. It includes `memory.md` and the updated context files alongside the
  code, plus the 15 prettier-drift files he chose to keep.
- The M-Pesa verification payment flow was **not** modified this session, apart from the
  new approval-time document check.

## Next session starts with

- **The next step is the user verification process plus paying the registration fee by
  M-Pesa.** Before changing anything, read the existing flow end to end and confirm with
  Michael what he actually wants here — end-to-end validation of what exists, or new work.
  What exists today:
  - `src/services/verification.service.ts` — `submitForVerification` (draft →
    `pending_payment`), `resubmitForVerification` (rejected → free window while
    `verificationAttempts <= FREE_REJECTIONS`, then paid), `renewVerification`
    (`verification_expired` → `pending_payment`), `advanceToReview` (`pending_payment` →
    `pending_review`), `approveVerification` / `rejectVerification`, and the transition
    table `TRANSITIONS`.
  - `src/services/payment.service.ts` — `initiatePayment` (STK push), `handleCallback` →
    `settleCallback` → `activateVerificationOnPayment` → `advanceToReview`, and
    `expireTimedOutPayments` (2-minute window, run every minute by
    `src/jobs/payment-timeout.ts`).
  - `src/services/settings.service.ts` — `getVerificationFee`; the verification page
    passes it when the state is `pending_payment`.
  - `src/lib/mpesa.ts` — `initiateStkPush`, `getCallbackMetadataValue`; the callback route
    is `src/app/(payload)/api/webhooks/payments/callback/route.ts`.
  - A dev-only `simulatePaymentCallbackAction` was removed in an earlier session; payments
    settle identically in dev and production, and the dev tunnel is `app-dev.s3.co.ke`.
- Then run the same loop as this session: `/architect` for anything non-trivial,
  implement, `pnpm.cmd format` → `pnpm.cmd lint` → `pnpm.cmd build`, then
  `/review uncommitted`.

## Open questions

- **`pending_payment` may be a dead end after an expired STK push.**
  `expireTimedOutPayments` expires only the payment record — the profile stays in
  `pending_payment`, whose only transitions are `pending_review`, `blacklisted` and
  `deactivated`: there is no route back to `draft`. Confirm the worker can always retry
  the payment from the verification page, and decide whether an expired payment should
  return them to `draft` or keep producing a fresh payment. This is squarely in the next
  step's area.
- **Deferred manual check:** a `verified` worker uploading only the back keeps their badge
  and their directory listing (the `wasVerified && previousId` fix). Michael will check
  this at a later step.
- **Carried over from the previous session, still unresolved:** `dateOfBirth` is identity
  data yet is neither starred nor in the completeness list; `displayName` is
  schema-required while `PROFILE_REQUIRED_FIELDS` omits it, and its helper text promises a
  first-name fallback that `toProfileData` does not implement.
- **Carried over, still unresolved:** the "public free-text must reject contact details"
  rule lives only in `code-standards.md`; promote it to a numbered invariant in
  `architecture.md` or leave it as an implementation rule?
- If a real worker ever hits the `employer` contact-details rejection as a false positive,
  revisit the patterns in `profile-schema.ts` rather than removing the check.
