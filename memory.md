# Memory — Phase 2.2 Document Vault + pulled-forward operational UI

Last updated: 2026-08-31

## What was built

- **Phase 2.2 Document vault** — `vault-documents` collection (`signedDownloads`,
  sealed create/update/delete, `read` = owner+staff+admin via `uploadedBy`),
  upload/replace/delete UI at `/dashboard/mjakazi/documents`, audited signed-URL
  route `GET /api/actions/vault/{id}` (authz → audit → 60s redirect). Added
  `document_uploaded` / `document_deleted` / `document_viewed` audit actions.
- **Staff management** (`/dashboard/admin/staff`, admin-only) — create/list/rename/delete
  staff, Payload panel retained as silent fallback.
- **Account management** (`/dashboard/accounts/{wajakazi,waajiri}`, admin+staff) —
  list/rename, admin-only delete with cascade (documents → profile → photo → user → Clerk).
- **Audit log viewer** (`/dashboard/audit-logs`, admin+staff) — filter by action/source,
  pagination, flattened metadata, mobile card-list.
- **Sign-in/up wait screen** — `/authenticating` client page ("Signing you in…" /
  "Creating your account…") that fetches `/post-auth` (route handler returning the
  redirect target as JSON) then navigates.
- **Profile form polish** — red asterisks on required fields + legend; display-name
  helper note.
- **SaaS metadata branding** — `(saas)/layout.tsx` now `title.template: "%s | Mjakazi Connect"` + full favicon set.

## Decisions made

- **Operational UI pulled forward** from Phase 10 (basics only): staff + account
  management and the audit viewer now; moderation (suspend/reinstate/blacklist)
  stays in Phase 10.1.
- **Email visibility** — `users.read` is now `isAdminOrStaffOrSelf` (staff see
  name/email/role/state); `users.update` is `isAdminOrStaffOrSelfAccountEdit`
  (staff edit SaaS accounts only); `clerkId` and `password` are admin-only.
  Invariant #18 + access docs updated.
- **"Edit" = rename only** (first/last name); email locked after creation.
- **Display name** seeds to first name only (fallback `"Mjakazi"`), never full
  name or email, since it is public in the directory.
- **Lists use the `divide-y` card-list pattern** (stack on mobile), not v1's `<Table>`.
- **One file per document type**; re-upload replaces (create-then-delete).

## Problems solved

- **Staff creation 422** — Clerk required `legal_accepted_at`; added
  `legalAcceptedAt: new Date()` to `createClerkUser` in `clerk-sync.ts`.
- **"rendering…" hang on sign-in** — `redirect()` inside a Suspense-bounded server
  component stalled; reverted `/post-auth` to a route handler + client interstitial.
- **Base UI `Select.onValueChange` is `string | null`** — coerce with `?? "all"`.
- **Access union type error** — `isAdminOrStaffOrSelfAccountEdit` returns two query
  shapes; widened return type to `boolean | Where`.
- **PostHog console noise** — `capture_exceptions: false` and duplicate
  `NEXT_PUBLIC_POSTHOG_HOST` (was the app's own ngrok URL) removed.

## Current state

- Phase 2.2 **complete** — both documents uploaded and the view link behaves
  (401 signed-out / 404 other-Mjakazi). `pnpm lint` (0 errors) + `pnpm build` pass.
- Staff/account/audit-log management working end-to-end.
- **Deferred**: staff/admin document *view* still needs manual testing — will be
  exercised by the Phase 3.3 review queue.

## Next session starts with

Phase 3.1 — Verification state machine (`services/verification.service.ts`, eight
states, explicit transitions, audit on each; no payment wiring yet). This is the
next item on the critical path after Documents.

## Open questions

- Whether "edit account" should ever grow beyond name-only (e.g. profile fields).
- Staff/admin document-view verification (Phase 3.3) is unverified until the
  review queue exists.
