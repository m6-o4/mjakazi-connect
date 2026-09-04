# Progress Tracker

## Purpose

A running log of work actually completed on this project — the historical record, as
opposed to `build-plan.md`'s forward-looking roadmap. Updated after every feature is
finished.

## How to Use

- **After completing a feature**: add an entry below with what was built.
- Cross-reference the corresponding item in `build-plan.md` if relevant.

## Log Entry Format

### [YYYY-MM-DD] — Feature Name

- **What was built**: brief description
- **Files touched**: key files/folders
- **Notes**: anything future work should know (decisions made, deviations from plan, known
  follow-ups)

---

## Log

### 2026-08-26 — Phase 0.1: Role enum migration

- **What was built**: Replaced the template's `admin | editor | user` with this project's
  `admin | staff | mwajiri | mjakazi`. Added `accountState`, `suspendedAt`,
  `suspensionReason`. Clerk sync hooks updated to drop the `user` fallback.
- **Files touched**: `src/payload/collections/users/schema.ts`,
  `src/payload/access/access-control.ts`, `src/payload/strategy/clerk-strategy.ts`,
  `src/payload/hooks/clerk-sync.ts`, `src/app/(payload)/api/webhooks/clerk/route.ts`,
  `src/payload.config.ts`
- **Notes**: Strict role enforcement — no default value, required field. No occurrence of
  `"editor"`, `"user"` as a role, or `isAuthenticatedOrPublished` remains. Bootstrap admin
  `publicMetadata.role` still needs verifying in the Clerk Dashboard.

### 2026-08-26 — Phase 0.2: Dependencies and environment

- **What was built**: Installed project dependencies and verified `.env` configuration
  against `.env.example`.
- **Files touched**: `package.json`, `.env.example`
- **Notes**: PostHog keys deferred to Phase 0.5 (skipped). `pnpm build` passes.

### 2026-08-26 — Phase 0.3: Design tokens

- **What was built**: Implemented brand design tokens (light and dark) and wired Plus
  Jakarta Sans via `next/font`.
- **Files touched**: `src/globals.css`
- **Notes**: Every token in `ui-tokens.md` resolves; no hardcoded hex anywhere.

### 2026-08-26 — Phase 0.4: Audit logging

- **What was built**: `audit-logs` collection (immutable) and `writeAuditLog()` utility.
  Renamed `isAdminOrSA` to `isAdminOrStaff`.
- **Files touched**: `src/payload/collections/audit-logs/schema.ts`,
  `src/payload/collections/index.ts`, `src/lib/audit.ts`
- **Notes**: Fixed `@payload-config` import path in `src/lib/audit.ts` via TS path
  mapping.

### 2026-08-26 — Phase 0.5: PostHog (skipped)

- **Notes**: Deferred due to operational constraints. Completed 2026-08-29 (see entry
  below).

### 2026-08-28 — Phase 1.1: Sign-up with role intent

- **What was built**: Clerk sign-up page reading `?role=`, validating against
  `mjakazi | mwajiri`, and passing it as `unsafeMetadata`. Bare/invalid `?role=` redirects
  to `/registration` — never guesses. The `/registration` chooser itself is served by the
  existing CMS `registration` block via the `(web)/[slug]` route (no dedicated page).
- **Files touched**: `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`,
  `src/payload/blocks/registration/component.tsx` (converted to shadcn `Card`)
- **Notes**: `/registration` is CMS-managed (per `project-overview.md`), not hardcoded.
  Sign-up redirects to `/post-auth`, which does not exist until 1.2 — post-sign-up
  currently ends in a 404 by design. Google OAuth was unreliable (Clerk's OAuth flow kept
  looping and, when it did progress, fell back to a pre-filled create-account dialog), so
  the social button is now hidden on both sign-up and sign-in — email/password with
  Clerk's email verification is the sign-up path. To fully cut off OAuth, disable the
  Google social connection in the Clerk Dashboard. Sign-in now has the same `appearance`
  as sign-up and no `forceRedirectUrl` (it honors `redirect_url`, so an admin signing in
  returns to `/admin`).

### 2026-08-28 — Phase 1.2: Post-auth promotion and dispatch

- **What was built**: `(auth)/post-auth/route.ts` — the single server-side path that turns
  declared intent into an authorized role. Reads `publicMetadata.role` and
  `unsafeMetadata.role`; uses an existing valid role as-is (never overwrites); otherwise
  promotes `unsafeMetadata.role` only when it is in the typed `mjakazi | mwajiri`
  allowlist, nulls `unsafeMetadata`, then resolves the Payload user with retry and
  redirects by role.
- **Files touched**: `src/app/(auth)/post-auth/route.ts`
- **Notes**: Uses `updateUserMetadata()` (the `updateUser()` metadata path is deprecated
  in `@clerk/backend` 3.16). Promotion allowlist is `mjakazi | mwajiri` only, so
  `?role=admin` cannot self-escalate. Redirect targets are `/dashboard/{role}`, which
  don't exist until 1.4 — metadata promotion is verifiable now, end-to-end dashboard
  landing after 1.4. `VALID_ROLES` is duplicated across the webhook, strategy and here —
  consolidate into a shared helper at some point.

### 2026-08-28 — Phase 1.3: Domain profiles

- **What was built**: `wajakazi-profiles` and `waajiri-profiles` collections (1:1 via a
  unique `user` relationship), and `services/identity.service.ts` with idempotent
  `ensureProfile()` called from `/post-auth` on every sign-in. Creates the right profile
  kind for the role, and never a duplicate.
- **Files touched**: `src/payload/collections/wajakazi-profiles/schema.ts`,
  `src/payload/collections/waajiri-profiles/schema.ts`,
  `src/services/identity.service.ts`, `src/payload/collections/index.ts`,
  `src/app/(auth)/post-auth/route.ts`
- **Notes**: Only the identity/state core was built (user, displayName, verificationState,
  availabilityStatus, profileComplete for wajakazi; user, phone, location, blacklistState,
  blacklistedAt for waajiri). The full professional profile fields land in 2.1.
  `ensureProfile` runs on every sign-in, so a profile missed during sign-up (webhook lag)
  self-heals on the next visit. Requires `pnpm build` (regenerates `payload-types.ts`).

### 2026-08-29 — Phase 1.4: Route guards and dashboard shells

- **What was built**: `(saas)/dashboard` shell (sidebar + topbar + user chip + graceful
  sign-out), a dynamic `[role]` dashboard route with a role guard, and `/dashboard`
  redirecting to the caller's role. `(payload)/layout.tsx` now sends non-staff to their
  own dashboard (session intact) instead of `/sign-out`.
- **Files touched**: `src/app/(saas)/dashboard/layout.tsx`,
  `src/app/(saas)/dashboard/page.tsx`, `src/app/(saas)/dashboard/[role]/page.tsx`,
  `src/components/dashboard/{sidebar,topbar,sign-out-button}.tsx`, `src/lib/roles.ts`,
  `src/app/(payload)/layout.tsx`, `src/app/(auth)/post-auth/route.ts`
- **Notes**: Extracted `VALID_ROLES` / `REGISTRATION_ROLES` / `DASHBOARD_BY_ROLE` / role
  type guards into `src/lib/roles.ts` (shared by post-auth, dashboard guard, and payload
  layout). Sign-out uses `useClerk().signOut({ redirectUrl: "/" })` (client-side).
  Dashboard content is a placeholder — real per-role pages land in later phases.

### 2026-08-29 — Phase 0.5: PostHog (completed)

- **What was built**: Installed PostHog via the official wizard and confirmed working.
  Client-side `posthog-js` initialized in `instrumentation-client.ts` (root);
  identify/reset wired into the theme provider and sign-out; a `registration_started`
  capture in the registration block. `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and
  `NEXT_PUBLIC_POSTHOG_HOST` documented in `.env.example` and set in `.env`.
- **Files touched**: `instrumentation-client.ts`, `package.json`,
  `src/components/providers/theme-provider.tsx`, `src/app/(auth)/sign-out/page.tsx`,
  `src/components/dashboard/sign-out-button.tsx`,
  `src/payload/blocks/registration/component.tsx`, `.env.example`, `pnpm-workspace.yaml`
- **Notes**: Client-side only — no `posthog-node` server SDK yet. Fixed a `pnpm build`
  failure: `pnpm-workspace.yaml` had `core-js: set this to true or false` (a literal
  placeholder) under `allowBuilds`, which pnpm treats as unapproved and blocks `core-js`'s
  postinstall; changed to `core-js: true`. Package audit: Inngest is not installed or
  referenced in `src/` (Payload's own jobs queue is the pipeline); Clerk webhooks use
  `@clerk/nextjs/webhooks` `verifyWebhook`, not raw `svix` (svix never installed). Unused
  deps flagged for cleanup: `dotenv`, `@aws-sdk/client-s3` (transitive via
  `@payloadcms/storage-s3`), `jsdom`; plus `date-fns`, `react-hook-form`,
  `@hookform/resolvers`, `zod` (installed ahead of Phase 2.1).

### 2026-08-29 — Phase 2.1: Profile form

- **What was built**: The full mjakazi profile form at `/dashboard/mjakazi/profile`
  (identity + professional + work sections) with react-hook-form + zod, plus the mjakazi
  dashboard home showing a completeness card (progress + checklist). A separate photo
  upload (route handler, 5MB) persists the photo immediately. `profileComplete` is
  recomputed on every save from the 11 required fields.
- **Files touched**: `src/lib/profile-constants.ts` (new), `src/lib/phone.ts` (new),
  `src/lib/profile-schema.ts` (new), `src/services/profile.service.ts` (new),
  `src/app/actions/profile.ts` (new),
  `src/app/(payload)/api/actions/profile/photo/route.ts` (new),
  `src/app/(saas)/dashboard/mjakazi/{layout,page}.tsx` (new),
  `src/app/(saas)/dashboard/mjakazi/profile/page.tsx` (new),
  `src/components/dashboard/mjakazi/profile-form/*` (new),
  `src/components/dashboard/mjakazi/profile-completeness-card/index.tsx` (new),
  `src/payload/collections/profile-photos/schema.ts` (new),
  `src/payload/collections/wajakazi-profiles/schema.ts` (extended),
  `src/components/dashboard/sidebar.tsx` (Profile nav item)
- **Notes**: Field names follow `architecture.md` (`jobsSkills`, `about`,
  `yearsExperience`, `phone`, etc. — the v1 `bio`/`jobs`/`experience`/`phoneNumber` are
  renamed). Completeness rule = v1's 11 fields with `phone` included, single source of
  truth in `PROFILE_REQUIRED_FIELDS`. Profile photo is a new `profile-photos` upload
  collection (public binary, owner-managed), NOT the marketing `media` collection and NOT
  the (Phase 2.2) `vault-documents`. Photo upload is a route handler, not a Server Action,
  because Server Actions cap the request body at 1MB. `profileComplete` is field-locked to
  staff/admin, so the service writes it via a trusted `overrideAccess: true` write while
  user-editable fields go through `overrideAccess: false` + `req`. `profile_completed`
  PostHog event fires client-side on the first false→true completeness transition. Phone
  numbers are normalized to `254…` in `lib/phone.ts`. Date fields use a shadcn
  `Calendar`/`Popover` picker (`react-day-picker`, added via the CLI) for consistency.
  Made the dashboard shell mobile-responsive: the sidebar is now a desktop-only rail
  (`hidden md:flex`) and the same nav lives in a hamburger `Sheet` (`MobileNav`) in the
  topbar below `md`; nav items are shared via `src/lib/dashboard-nav.ts`. `about` is
  capped at 200 words (shared `ABOUT_MAX_WORDS`/`countWords` in `lib/profile-schema.ts` +
  a live counter in the form). Buttons use `cursor-pointer` (Tailwind v4 resets `<button>`
  to `cursor: default`). Follow-ups: `getCurrentUser` wrapped in React `cache()` so the
  shell layout + role layout + page authenticate once per request; and `eslint.config.mjs`
  now ignores `**/.next/` + `design/` so `pnpm lint` stops scanning the v1 reference
  codebase's build output.

### 2026-08-30 — Phase 2.2: Document vault

- **What was built**: `vault-documents` upload collection (sealed create/update/delete,
  `read` = owner + staff + admin scoped by `uploadedBy`), registered in S3 with
  `signedDownloads: true` (private ACL, no public object path). Upload, replace, view and
  delete flow at `/dashboard/mjakazi/documents`. Documents are delivered only through
  `GET /api/actions/vault/{id}`, which authorizes (role + ownership) and writes a
  `document_viewed` audit entry before redirecting to a 60s signed URL. Added
  `document_uploaded` / `document_deleted` / `document_viewed` audit actions.
- **Files touched**: `src/lib/vault.ts` (new), `src/lib/s3.ts` (new),
  `src/payload/collections/vault-documents/schema.ts` (new),
  `src/services/vault.service.ts` (new), `src/app/(payload)/api/actions/vault/route.ts`
  (new), `src/app/(payload)/api/actions/vault/[id]/route.ts` (new),
  `src/app/(saas)/dashboard/mjakazi/documents/page.tsx` (new),
  `src/components/dashboard/mjakazi/document-vault/index.tsx` (new),
  `src/payload/collections/index.ts`, `src/payload/plugins/schema.ts`, `src/lib/audit.ts`,
  `src/payload/collections/audit-logs/schema.ts`, `src/lib/dashboard-nav.ts`,
  `src/app/(saas)/dashboard/mjakazi/page.tsx`
- **Notes**: One file per document type (`national_id`, `certificate_of_good_conduct`);
  re-upload replaces (create-then-delete). 5MB cap, PDF/JPEG/PNG/WebP only. Delivery is
  redirect-to-signed-URL (the v1-proven pattern) rather than proxy-streaming.
  `@aws-sdk/s3-request-presigner` added as a direct dependency (was already transitive via
  `@payloadcms/storage-s3`). Documents do not feed `profileComplete` — they are the
  separate verification step. The `pending_review` lock on edits is deferred to Phase
  3.2/4.4. `documents_uploaded` PostHog event fires when both slots fill. `pnpm build`
  passes (only the known-harmless `sharp` EPERM symlink warnings on Windows). **Manual
  verification (2026-08-31)**: both documents uploaded ✓; view link 401 signed-out / 404
  other-Mjakazi ✓; staff/admin document view deferred to Phase 3.3 (review queue).

### 2026-08-31 — Staff + account management (basics, pulled forward)

- **What was built**: Admin staff management at `/dashboard/admin/staff` — create, list,
  rename and delete staff, with Payload retained as the silent fallback. Wajakazi/Waajiri
  account management at `/dashboard/accounts/{wajakazi,waajiri}` — list + rename (admin +
  staff), admin-only delete with full cascade (documents → profile → photo → user →
  Clerk).
- **Access change**: `users.read` relaxed to `isAdminOrStaffOrSelf` so staff see
  name/email/role/state; `users.update` is the new `isAdminOrStaffOrSelfAccountEdit`
  (staff edit SaaS accounts only); `clerkId` and `password` are now admin-only. Invariant
  #18 and the access-control docs updated to match.
- **Files touched**: `access-control.ts`, `users/schema.ts`, `staff.service.ts` (new),
  `accounts.service.ts` (new), `app/actions/staff.ts` (new), `app/actions/accounts.ts`
  (new), `dashboard/admin/staff/page.tsx` (new),
  `dashboard/accounts/{wajakazi,waajiri}/page.tsx` (new),
  `components/dashboard/admin/{create-staff-form,staff-table,edit-name-form}` and
  `components/dashboard/accounts/accounts-table` (new), `dashboard-nav.ts`,
  `architecture.md`, `library-docs.md`.
- **Notes**: Moderation (suspend/reinstate/blacklist) deliberately deferred — account
  state transitions land in Phase 10.1. "Edit" means rename (first/last name); email is
  locked after creation. Staff manage SaaS accounts but never back-office accounts.
  `pnpm build` passes.

### 2026-08-31 — Audit log viewer + fixes

- **What was built**: Read-only audit log viewer at `/dashboard/audit-logs` (admin +
  staff) — filter by action/source, pagination, actor → target display, flattened
  metadata, mobile-responsive card-list. Replaces the v1 `<Table>` with the `divide-y` row
  pattern used by the accounts lists.
- **Fixes**: `clerk-sync.ts` now sends `legalAcceptedAt: new Date()` (staff creation was
  failing with a 422). Waajiri delete confirmation wording corrected (no "documents"
  clause). `/post-auth` stays a route handler returning the redirect target, and a new
  `/authenticating` wait page ("Signing you in…" / "Creating your account…") fetches it
  client-side before navigating; sign-in/sign-up now `forceRedirectUrl` to
  `/authenticating?action=…` (a first attempt used a Suspense + `redirect()` page and
  hung, so it was reverted). Renamed `isAdminOrSelfOrStaffAccountEdit` →
  `isAdminOrStaffOrSelfAccountEdit`.
- **Files touched**: `components/dashboard/audit-logs/audit-log-table.tsx` (new),
  `(saas)/dashboard/audit-logs/page.tsx` (new),
  `components/auth/{authenticating,post-auth-resolver}.tsx` (new),
  `(auth)/post-auth/page.tsx` (new), `dashboard-nav.ts`, `clerk-sync.ts`,
  `accounts-table.tsx`, the accounts pages, sign-in/up pages.

### 2026-09-01 — Phase 3.1: Verification state machine

- **What was built**: `services/verification.service.ts` — the eight-state verification
  state machine as an explicit transition whitelist, with ten exported transition
  functions (`submitForVerification`, `resubmitForVerification`, `renewVerification`,
  `advanceToReview`, `approveVerification`, `rejectVerification`, `revertToReview`,
  `expireVerification`, `blacklistProfile`, `deactivateProfile`). Each is guarded on actor
  role + current state and writes an audit entry with first-class
  `previousState`/`newState`/`reason`. Every transition is a compare-and-swap (0 docs
  updated → `conflict`). No payment wiring, no UI, no bypass — `advanceToReview`
  (`pending_payment → pending_review`) has no caller until Phase 4.4.
- **Schema**: `wajakazi-profiles` gained `verificationSubmittedAt`,
  `verificationReviewedAt`, `verificationExpiry`, `verificationAttempts`,
  `lastVerificationPaymentId`, `blacklistedAt`, `deactivatedAt`, `rejectionReason`,
  `verificationNotes` (all field-locked to staff/admin). `audit-logs` gained
  `previousState`/`newState`/`reason` and six new actions (`verification_advanced`,
  `verification_resubmitted`, `verification_reverted`, `verification_expired`,
  `verification_blacklisted`, `verification_deactivated`); `lib/audit.ts` extended to
  match.
- **Files touched**: `services/verification.service.ts` (new),
  `payload/collections/wajakazi-profiles/schema.ts`,
  `payload/collections/audit-logs/schema.ts`, `lib/audit.ts`, `payload-types.ts`
  (regenerated).
- **Notes**: The transition graph corrects the product spec — rejection is free to retry
  (`rejected → pending_review`) up to 3 rejections, and the 4th forces a fresh fee
  (`rejected → pending_payment`); `verificationAttempts` resets to 0 on the next confirmed
  payment. `verified → pending_review` exists for legal-name/ID change (no caller yet).
  Expiry is 12 months via `date-fns addMonths`. `blacklisted` and `deactivated` are
  terminal. Verified with a throwaway `tsx` scratch script (21/21 legal + illegal
  transitions passed), then deleted. `pnpm lint` (0 errors) and `pnpm build` pass. Open:
  the `verified → pending_review` identity-change _trigger_ (profile/document-edit
  detection) and the "fresh Certificate" renewal check land in later phases.

### 2026-09-01 — Phase 3.2: Submit for verification

- **What was built**: The verification page at `/dashboard/mjakazi/verification`,
  state-aware across all eight verification states. The `draft` state renders a readiness
  checklist (profile complete + both documents) with a submit button wired to
  `submitForVerification` via a Server Action; every other state renders correct status
  copy with no action buttons yet. The `pending_payment` state is an honest "awaiting
  payment" card with no price or pay button (payment lands in Phase 4.4, the fee in
  `platform-settings`). Added the "Verification" nav item and linked the overview
  `VerificationStatusCard` "ready" state to the new page.
- **Files touched**: `app/actions/verification.ts` (new),
  `app/(saas)/dashboard/mjakazi/verification/page.tsx` (new),
  `components/dashboard/mjakazi/verification/submit-verification.tsx` (new),
  `components/dashboard/mjakazi/verification/verification-state.tsx` (new),
  `lib/dashboard-nav.ts`,
  `components/dashboard/mjakazi/verification-status-card/index.tsx`,
  `context/ui-registry.md`.
- **Notes**: Submit is a Server Action (not a route handler) per the "prefer a Server
  Action" rule. `verification_submitted` PostHog event fires client-side on success; the
  `verification_submitted` audit entry is written inside the service transition. Resubmit
  (`resubmitForVerification`) and renew (`renewVerification`) are deliberately not wired —
  `rejected` and `verification_expired` are unreachable until Phases 3.3 / 7.1. No schema
  change, so no `generate:types` needed.

### 2026-09-01 — Phase 3.3: Staff review queue

- **What was built**: The verification review queue at `/dashboard/staff/verifications`
  (admin + staff) — every `pending_review` profile, oldest submission first — and a
  per-case review screen at `/dashboard/staff/verifications/[id]` showing the legal name,
  date of birth, nationality and phone next to the National ID and Certificate of Good
  Conduct side by side. Approve and reject are wired to the existing `approveVerification`
  / `rejectVerification` service functions (mandatory reject reason, attempts increment,
  12-month expiry on approve). Documents render through the existing audited vault route,
  so every view still writes a `document_viewed` entry.
- **Files touched**: `services/verification.service.ts` (added `listPendingReviews`),
  `app/actions/verification.ts` (added `approveVerificationAction` /
  `rejectVerificationAction`), `app/(saas)/dashboard/staff/verifications/page.tsx` (new),
  `app/(saas)/dashboard/staff/verifications/[id]/page.tsx` (new),
  `components/dashboard/staff/verifications/{verification-queue,document-viewer,review-form}.tsx`
  (new), `lib/dashboard-nav.ts`, `context/ui-registry.md`.
- **Notes**: No schema change, so no `generate:types`. The document viewer points
  `<iframe>`s at `/api/actions/vault/{id}` rather than minting signed URLs server-side, so
  role check and the audit entry stay in exactly one place. Approve carries no notes field
  (the service's optional `notes` stays unwired — not in the plan). Rejected profiles
  never become directory-visible because the directory guard requires `verified`
  (invariant #17), not merely `pending_review` exiting. `verification_approved`
  (`daysToVerify`) and `verification_rejected` (`attempt`) PostHog events fire client-side
  on success. Manual verification pending.

### 2026-09-01 — Phase 4.1: Payments collection and M-Pesa client

- **What was built**: The `payments` collection (sealed — `create`/`update`/`delete`
  restricted, `read` = admin/staff/owner) with the full `architecture.md` field set
  (`user`, `paymentType`, `status`, `amount`, `tier`, `phoneNumber`, `mpesaReference`
  unique, `merchantRequestId`, `checkoutRequestId`, `callbackPayload`,
  `initiatedAt`/`confirmedAt`/`failedAt`/`expiredAt`). A server-only `lib/mpesa.ts` Daraja
  client (base-URL resolution by `MPESA_ENVIRONMENT`, Africa/Nairobi timestamp, password
  generation, cached OAuth token, STK push). A `services/payment.service.ts`
  `initiatePayment()` that mints a unique reference, creates the `initiated` record, sends
  the push, and lands the record at `stk_sent` (accepted) or `failed` (rejected) with
  audit entries.
- **Files touched**: `src/payload/collections/payments/schema.ts` (new),
  `src/payload/collections/index.ts`, `src/lib/mpesa.ts` (new),
  `src/services/payment.service.ts` (new), `src/payload-types.ts` (regenerated).
- **Notes**: `mpesaReference` is _our_ minted 12-char unique reference (fits Daraja's
  `AccountReference` 12-char cap), and `checkoutRequestId` is Daraja's per-push id — the
  Phase 4.2 callback matching/idempotency key. Phone normalization reuses
  `normalizeKenyanPhone` from `lib/phone.ts` (single source of truth) rather than
  duplicating in `lib/mpesa.ts`. No server-side PostHog events yet (no `posthog-node` SDK
  installed; `payment_initiated`/`payment_failed` will fire client-side with the purchase
  UI in later phases). The initiate _route_ (`/api/actions/payments/initiate`) is
  deliberately deferred to 5.2; 4.1 has no HTTP caller. `pnpm lint` (0 errors, 1
  pre-existing `pages/schema.ts` warning) and `pnpm build` pass. **Manual verification
  pending**: initiate an STK push against the sandbox and confirm the prompt reaches the
  handset and the `payments` record is `stk_sent`.

### 2026-09-01 — Phase 4.2: Payment callback handling

- **What was built**: The M-Pesa STK callback route at `/api/webhooks/payments/callback`
  (`route.ts`) plus `handleCallback` / `settleCallback` in `payment.service.ts`. Daraja's
  callback body is parsed by a new zod schema + `parseStkCallback` in `lib/mpesa.ts`. The
  service finds the payment by `checkoutRequestId` (the idempotency key), verifies
  merchant correlation (`MerchantRequestID`), amount and phone before writing `confirmed`
  (or `failed`), stores the raw callback in `callbackPayload`, and writes a
  `payment_confirmed` / `payment_failed` audit entry. Duplicate and unverifiable callbacks
  are refused and audit-logged via a new `payment_duplicate` action. No domain transition
  yet — that is Phase 4.4.
- **Files touched**: `src/app/(payload)/api/webhooks/payments/callback/route.ts` (new),
  `src/lib/mpesa.ts` (callback schema + parser), `src/services/payment.service.ts`
  (`handleCallback`/`settleCallback`), `src/lib/audit.ts` (`payment_duplicate` action),
  `src/payload/collections/audit-logs/schema.ts` (`payment_duplicate` option),
  `src/payload-types.ts` (regenerated).
- **Notes**: The callback carries no signature (unlike Clerk), so authenticity rests
  entirely on the correlation checks. Every path returns 200 to Daraja so it never
  retries. Amount/phone/merchant mismatches land the payment at `failed` (fail-safe — no
  access granted). `MpesaReceiptNumber` is captured into the `payment_confirmed` audit
  metadata rather than a dedicated schema field, resolving the 4.1 open question for now.
  `pnpm lint` (0 errors) and `pnpm build` pass. **Manual verification pending**: pay in
  the sandbox, then replay the same callback by hand — the second must be refused and
  audit-logged (`payment_duplicate`).

### 2026-09-01 — Verification approval/rejection emails (3.3 follow-up)

- **What was built**: Transactional emails on staff approve/reject of a mjakazi
  verification. `sendVerificationApprovedEmail` (new — v1 only emailed on rejection) and
  `sendVerificationRejectedEmail` (reason + free resubmissions remaining) in a new
  `src/lib/email.ts`, sent through Payload's `sendEmail` (Resend adapter) with brand-token
  inline-styled HTML. Wired into `approveVerification`/`rejectVerification` via a
  `notifyWorker` helper that resolves the owner's `users.email` and sends after the
  transition commits.
- **Files touched**: `src/lib/email.ts` (new), `src/services/verification.service.ts`
- **Notes**: Email is fire-and-forget — a failed send is caught + logged and never blocks
  the state transition (library-docs.md → Resend).
  `attemptsRemaining = max(0, FREE_REJECTIONS - attempts)` mirrors v1's "3 - attempts"
  copy. `from` and `fromName` come from the adapter's `RESEND_FROM_*` env, not hardcoded.
  Email templates inline the ui-tokens hex values directly (clients strip CSS variables) —
  the one justified hardcoded-hex exception. `pnpm lint` (0 errors) and `pnpm build` pass.
  **Manual verification pending**: approve and reject a sandbox profile and confirm both
  emails arrive.

### 2026-09-01 — Phase 4.3: Payment timeout task

- **What was built**: The `payment-timeout` job on Payload's queue. A new
  `jobs/payment-timeout.ts` registers a task with `schedule` every minute and a handler
  that delegates to `expireTimedOutPayments()` in `payment.service.ts`. The service polls
  `stk_sent` payments older than the 2-minute window, compare-and-swaps each to `expired`
  (only if still `stk_sent`), stamps `expiredAt`, and writes a `payment_expired` audit
  entry.
- **Files touched**: `src/jobs/payment-timeout.ts` (new),
  `src/services/payment.service.ts` (`expireTimedOutPayments`), `src/payload.config.ts`
  (`jobs.tasks`).
- **Notes**: 2-minute window matches v1's Inngest timeout. Idempotent — CAS on
  `status === "stk_sent"`, so a concurrent callback wins; polls every minute so a missed
  window self-corrects. `payment_expired` audit action already existed (4.1/4.2), so no
  schema change and no `generate:types`. The `status` query is on the indexed field; the
  window filter is applied in JS to keep the run cheap. No domain transition — that is
  4.4. `pnpm lint` (0 errors) and `pnpm build` pass. **Manual verification pending**:
  initiate an STK push, ignore the prompt, and confirm the record is `expired` after ~2
  minutes.

### 2026-09-01 — Phase 4.4: Verification payment (initiate + wire to review)

- **What was built**: The verification payment end to end. A minimal admin-only
  `platform-settings` global (`verificationFee`, default 1500 — pulled forward from 10.3)
  sourced via `getVerificationFee` in a new `settings.service.ts`. The initiate as a
  Server Action (`initiateVerificationPaymentAction`) that reads the fee and the profile
  phone and calls the existing `initiatePayment` with `paymentType = verification`. The
  `pending_payment` pay UI (`PayVerification`) with STK-push + confirmation polling. The
  confirmed-callback wire-up: `payment.service` now calls `activateVerificationOnPayment`
  after a confirmed verification payment, which resolves the profile by user and runs
  `advanceToReview` (now storing `lastVerificationPaymentId` and resetting attempts). The
  `pending_review` document lock in `vault.service.ts` (upload and delete refuse while
  under review). A `payment_activation_failed` audit action for activation failures.
- **Files touched**: `src/payload/blocks/globals/platform-settings/schema.ts` (new),
  `src/payload/blocks/globals/index.ts`, `src/services/settings.service.ts` (new),
  `src/app/actions/payment.ts` (new),
  `src/components/dashboard/mjakazi/verification/pay-verification.tsx` (new),
  `src/services/verification.service.ts` (`advanceToReview` +
  `activateVerificationOnPayment`
  - `loadProfileByUserId`), `src/services/payment.service.ts` (activation after confirm +
    server-side PostHog), `src/lib/posthog-server.ts` (new),
    `src/services/vault.service.ts` (document lock), `src/lib/audit.ts`,
    `src/payload/collections/audit-logs/schema.ts`,
    `src/app/(saas)/dashboard/mjakazi/verification/page.tsx`,
    `src/components/dashboard/mjakazi/verification/verification-state.tsx` (`StatusState`
    type), `src/payload-types.ts` (regenerated).
- **Notes**: Initiation was pulled forward out of 5.2 per the 4.4 scope decision. Fee
  comes from `platform-settings`, never hardcoded (invariant #12). Document lock applies
  to `pending_review` only — workers can still fix documents while
  `draft`/`pending_payment`. On activation failure the payment stays `confirmed`
  (immutable), the error is logged and a `payment_activation_failed` audit entry is
  written; no admin alert or retry job in 4.4. Idempotency rests on the payment's
  terminal-state check (duplicate callbacks never reach activation) and
  `advanceToReview`'s CAS on `pending_payment`. Server-side PostHog is now wired
  (`lib/posthog-server.ts`, `posthog-node`): `payment_completed` fires on a confirmed
  callback and `payment_failed` on callback rejection or timeout, both captured with the
  payer's Clerk id as `distinctId` (resolved from `users.clerkId`) so they join the
  browser-identified person. `payment_initiated` remains client-side. `pnpm lint` (0
  errors, 2 pre-existing warnings) and `pnpm build` pass. **Manual verification pending**:
  submit a complete profile, pay the KSh 1,500 fee in the sandbox, and confirm the profile
  lands in `pending_review` with `lastVerificationPaymentId` set, documents locked, and
  `payment_confirmed` + `verification_advanced` audit entries; then replay the callback by
  hand and confirm nothing double-applies.

### 2026-09-01 — Phase 10.3 (partial): Admin platform settings UI

- **What was built**: The admin pricing UI at `/dashboard/admin/settings`. The
  `platform-settings` global gained a `subscriptionTiers` array (`tierId`, `name`,
  `price`, `durationDays`, `description`, `isActive`, `isConcierge`). Two admin forms —
  `PlatformSettingsForm` (verification fee) and `SubscriptionTiersForm` (editable tier
  list with Add/Remove + Active/Concierge checkboxes) — write through Server Actions
  (`updateVerificationFeeAction`, `updateSubscriptionTiersAction`) into a new
  `settings.service.ts` (`updateVerificationFee`, `updateSubscriptionTiers`). Added
  "Settings" to the admin nav.
- **Files touched**: `src/payload/blocks/globals/platform-settings/schema.ts` (tiers
  array), `src/services/settings.service.ts` (update fns), `src/app/actions/settings.ts`
  (new), `src/components/dashboard/admin/settings/platform-settings-form.tsx` (new),
  `src/components/dashboard/admin/settings/subscription-tiers-form.tsx` (new),
  `src/app/(saas)/dashboard/admin/settings/page.tsx` (new), `src/lib/dashboard-nav.ts`,
  `src/payload-types.ts` (regenerated).
- **Notes**: Follows the v1 pattern (start empty, Remove button + Active checkbox,
  PUT-replace the whole array), adapted to the current conventions — Server Actions
  instead of v1's `/apis` route handlers, and `isConcierge` added per the current spec.
  Validation (required fields, unique `tierId`, price and duration >= 1) lives in the
  service. Fee and tiers are admin-only at the panel surface; reads go through the trusted
  local-api path. **Partial** — the 10.3 "Done when" also requires the mwajiri pricing
  page to read the tiers at runtime, which is Phase 6.x and not built yet. The tiers are
  not yet consumed by any flow (subscription purchase is 5.2). `pnpm lint` + `pnpm build`
  pass. **Manual verification pending**: as admin, edit the fee and a tier in
  `/dashboard/admin/settings`, save, and confirm the values persist (reload the page).

### 2026-09-01 — Phase 5.1: Subscriptions collection and state machine

- **What was built**: The `subscriptions` collection (sealed — `create`/`update`/ `delete`
  restricted, `read` = admin/staff/owner; 1:1 `user` relation) with the six-state
  `subscriptionState`
  (`none | pending_payment | active | expired | suspended | blacklisted`),
  `tierId`/`tierName` snapshots, `tierStartedAt`/ `tierExpiry`,
  `suspendedAt`/`suspensionReason`, and `lastPaymentId`. A new
  `services/subscription.service.ts` with an explicit transition whitelist and six
  functions: `ensureSubscription`, `beginPurchase`, `activateSubscriptionOnPayment` (with
  stacking), `expireSubscription`, `suspendSubscription`, `blacklistSubscription` — each
  guarded on actor + current state, compare-and-swap, and audit-logged. `payments.tier`
  (`'1'|'2'|'3'`) replaced by `tierId` + `tierName` string snapshots in the same pass.
  Tier reads exposed via `getSubscriptionTiers` / `getTierById` in `settings.service.ts`.
- **Files touched**: `src/payload/collections/subscriptions/schema.ts` (new),
  `src/payload/collections/index.ts`, `src/services/subscription.service.ts` (new),
  `src/payload/collections/payments/schema.ts`, `src/services/payment.service.ts`,
  `src/services/settings.service.ts`, `src/services/identity.service.ts`,
  `src/lib/audit.ts`, `src/payload/collections/audit-logs/schema.ts`,
  `src/payload-types.ts` (regenerated).
- **Notes**: Stacking appends the new tier's `durationDays` to the existing `tierExpiry`
  (never `now()`); a fresh activation sets expiry from `now()`. The tier duration is read
  live from `platform-settings` at activation time, so an admin duration/price change
  applies with no deploy (invariant #12); only the tier identity is snapshotted on the
  subscription/payment. `none → active` and `expired → active` are defensive edges — a
  confirmed payment always grants access even if `beginPurchase` was skipped. The
  subscription record is created at mwajiri registration (`none`) via
  `ensureSubscription`, and `getOrCreateSubscription` re-creates it defensively on
  purchase if missing. `activateSubscriptionOnPayment` has no caller yet (wired in 5.2);
  `expireSubscription` (5.3) and suspend/blacklist (10.1) likewise. New audit actions:
  `subscription_purchase_started`, `subscription_activated`, `subscription_expired`,
  `subscription_suspended`, `subscription_blacklisted`. No PostHog events added.
  `pnpm lint` (0 errors, 2 pre-existing warnings) and `pnpm build` pass. **Manual
  verification pending**: none user-facing — the state machine is verified by the 5.2
  purchase flow and 5.3 expiry job.

### 2026-09-01 — Phase 5.2: Subscription purchase flow

- **What was built**: The mwajiri purchase flow at `/dashboard/mwajiri/subscription`. The
  page renders the active tiers live from `platform-settings.subscriptionTiers` and
  collects the M-Pesa phone number (normalized `254…`, persisted to
  `waajiri-profiles.phone` on purchase). A new Server Action
  (`initiateSubscriptionPaymentAction`) resolves the tier server-side, runs
  `beginPurchase`, and fires the STK push. The confirmed-callback wiring was completed in
  `payment.service.ts`: a confirmed `subscription` payment now calls
  `activateSubscriptionOnPayment` (built in 5.1) to grant or stack access, with a
  `payment_activation_failed` audit entry on failure. Added the mwajiri role-guarded
  layout and the "Subscription" nav item.
- **Files touched**: `src/services/payment.service.ts` (subscription activation),
  `src/services/profile.service.ts` (`getOwnWaajiriProfile`, `updateWaajiriPhone`),
  `src/services/subscription.service.ts` (`getOwnSubscription`),
  `src/app/actions/subscription.ts` (new), `src/app/(saas)/dashboard/mwajiri/layout.tsx`
  (new), `src/app/(saas)/dashboard/mwajiri/subscription/page.tsx` (new),
  `src/components/dashboard/mwajiri/subscription/purchase-subscription.tsx` (new),
  `src/lib/dashboard-nav.ts`.
- **Notes**: The client sends only `tierId` + `phone`; price and duration are resolved
  server-side from `platform-settings` (invariant #12). Phone persistence is best-effort —
  a failed write never blocks the payment. Stacking (active → extend) is handled by the
  existing `activateSubscriptionOnPayment`. PostHog `plan_selected` (`tierId`) and
  `payment_initiated` (`paymentType: "subscription"`, `tierId`) fire client-side;
  `payment_completed`/`payment_failed` are server-side (5.1/4.4). No schema change, so no
  `generate:types`. `pnpm lint` (0 errors, 2 pre-existing warnings) and `pnpm build` pass.
   **Manual verification pending**: as a mwajiri, choose a tier, enter a phone number, pay
   in the sandbox, and confirm the subscription flips to `active` with `tierExpiry` set;
   buy again while active and confirm the expiry extends; confirm the phone persists to
   `waajiri-profiles.phone`.

### 2026-09-02 — Phase 5.3: Subscription expiry task
- **What was built**: The `subscription-expiry` job on Payload's queue, hourly
  (`0 * * * *`). A new `jobs/subscription-expiry.ts` registers the task and delegates to
  `expireExpiredSubscriptions` in `subscription.service.ts`, which polls `active`
  subscriptions past their `tierExpiry` and expires each idempotently (reusing the 5.1
  `expireSubscription` transition + audit).
- **Files touched**: `src/jobs/subscription-expiry.ts` (new),
  `src/services/subscription.service.ts` (`expireExpiredSubscriptions`),
  `src/payload.config.ts` (`jobs.tasks`).
- **Notes**: Expiry transition is a CAS on `subscriptionState === "active"`, so a
  concurrent purchase/callback wins and the task never double-applies. A missed window
  self-corrects on the next run (polls for eligible records). Blocking *new reveals* is
  not implemented here — that is `contact.service` in Phase 6.4, which keys on
  `subscriptionState === "active"`; existing unlocks are unaffected by design. Expiry
  email is deferred to the 12.1 notifications sweep. No schema change, so no
  `generate:types`. `pnpm lint` (0 errors, 3 warnings — the new `TaskConfig<any>`
  warning matches `payment-timeout.ts`) and `pnpm build` pass. **Manual verification
  pending**: backdate an active subscription's `tierExpiry`, run the job, confirm the
  state becomes `expired` with a `subscription_expired` audit entry.

### 2026-09-02 — End-to-end pipeline verification (sign-up → verified) + fixes

- **What was built/verified**: Ran the mjakazi pipeline end to end for the first time —
  register → complete profile → upload both documents → submit → pay (sandbox) →
  `pending_review` → staff approve → `verified`. Confirmed the payment callback handler,
  `activateVerificationOnPayment` → `advanceToReview`, and the
  `pending_payment → pending_review → verified` transitions all work against real code.
- **Fixes**: (1) Integer-only pricing — `updateVerificationFee`/`updateSubscriptionTiers`
  now require `Number.isInteger`, plus `validate` functions on the `platform-settings`
  fields and `step={1}` + client checks on the admin forms (a fractional fee like `1.50`
  previously saved but then failed the payment path with "Invalid amount"). (2) Relaxed
  the STK callback parser in `src/lib/mpesa.ts` (`ResultCode` coerced to number, IDs
  coerced to string, `ResultDesc`/`CallbackMetadata` nullish) — the strict zod schema was
  dropping the sandbox callback as "unrecognized". (3) Added raw-body logging to the
  payment callback route on parse failure. (4) Fixed the mjakazi overview
  (`dashboard/mjakazi/page.tsx`) which always showed "ready for verification" because
  `VerificationStatusCard` only looked at documents; it now branches on
  `verificationState` (draft → documents card, pending_payment → awaiting-payment card,
  other states → `VerificationStateCard`).
- **Key finding — Daraja 3.0 sandbox**: The sandbox (Daraja 3.0, launched 2025-11-25) no
  longer completes STK pushes or fires the callback after PIN entry; v1 was tested
  against the old Daraja 2.0 sandbox, which auto-completed and reversed ~10 min later.
  The callback pipeline itself is proven working (Daraja → ngrok → route). To complete
  sandbox payments, `_scratch_fire_callback.ts` (repo root, untracked, NOT part of the
  app) reads the latest `stk_sent` payment and POSTs a correctly-matched callback to the
  live route — the same message Daraja sends in production. Production is unaffected: PIN
  entry fires the callback automatically there.
- **Files touched**: `src/services/settings.service.ts`,
  `src/payload/blocks/globals/platform-settings/schema.ts`,
  `src/components/dashboard/admin/settings/{platform-settings-form,subscription-tiers-form}.tsx`,
  `src/lib/mpesa.ts`, `src/app/(payload)/api/webhooks/payments/callback/route.ts`,
  `src/app/(saas)/dashboard/mjakazi/page.tsx`, `_scratch_fire_callback.ts` (scratch).
- **Notes**: `_scratch_fire_callback.ts` is a throwaway test helper — delete before
  commit. Next: test 2 more wajakazi — rejection (staff rejects with a reason, email
  sent, attempts increment) and approve/reject email delivery (Phase 3.3). Then the
  mwajiri subscription purchase flow (5.2), which needs the same callback helper. No
  `generate:types` needed (no schema shape change).

### 2026-09-04 — Verification resubmit, fee policy, and transactional emails

- **What was built/fixed**: (1) Wired the missing resubmit flow — `resubmitForVerification`
  existed in the service but had no caller, so a rejected mjakazi was stuck at
  "Not approved". Added `resubmitVerificationAction` (`src/app/actions/verification.ts`)
  and `ResubmitVerification` (`src/components/dashboard/mjakazi/verification/resubmit-verification.tsx`),
  rendered on the verification page when `rejected`. (2) Changed `FREE_REJECTIONS` from 3
  to 2 — two free resubmissions per fee, the third rejection requires a fresh fee; also
  fixed the rejection email's "resubmissions remaining" off-by-one
  (`FREE_REJECTIONS - attempts + 1`). (3) Restored the two missing transactional emails
  from v1: `sendPaymentConfirmedEmail` (mjakazi, wired into `activateVerificationOnPayment`)
  and `sendSubscriptionActivatedEmail` (mwajiri, wired into `activateSubscriptionOnPayment`),
  both fire-and-forget via `notifyPaymentReceived`/`notifySubscriptionActivated`. (4) Added
  the brand logo to the email template header (`mjakazi-connect-logo.png` served from
  `NEXT_PUBLIC_SERVER_URL`; falls back to text-only header when unset). (5) Switched the
  dev-only payment simulator gating from `NODE_ENV` to `MPESA_ENVIRONMENT !== "production"`.
  (6) Fixed the staff queue "Legal name not set" false label (it showed that whenever legal
  name === display name).
- **Files touched**: `src/app/actions/verification.ts`,
  `src/components/dashboard/mjakazi/verification/resubmit-verification.tsx` (new),
  `src/app/(saas)/dashboard/mjakazi/verification/page.tsx`,
  `src/services/verification.service.ts`, `src/services/subscription.service.ts`,
  `src/lib/email.ts`, `src/app/actions/dev.ts`,
  `src/components/dashboard/dev/dev-payment-simulate.tsx`,
  `src/app/(saas)/dashboard/mjakazi/page.tsx`,
  `src/app/(saas)/dashboard/mwajiri/subscription/page.tsx`,
  `src/components/dashboard/staff/verifications/verification-queue.tsx`,
  `context/architecture.md` (dev-simulator exception note).
- **Follow-up (flagged)**: verification expiry email — send a reminder before and a notice
  at `verification_expired` ("renew to stay visible"). Currently deferred to the Phase 12.1
  notifications sweep. Not started.

---

## Backlog — Dashboard Overview Fixtures

Agreed 2026-09-04. Permanent at-a-glance fixtures for each role's overview. Add real
`page.tsx` files (admin/staff/mwajiri currently fall through to the `dashboard/[role]`
placeholder) as each is built. Data is already available unless marked "later phase".

### Admin (`/dashboard/admin`)
- [x] Pending verifications (`pending_review` count) → links to queue
- [x] Verified wajakazi count
- [x] Active subscriptions count
- [x] Waajiri accounts count
- [ ] Revenue snapshot (confirmed payments total + last 30 days) — `payments`
- [ ] Platform totals (wajakazi accounts, total profiles)
- [ ] Recent activity feed (latest `audit-logs` entries)
- [ ] Quick actions (queue / settings / staff)

### Staff (`/dashboard/staff`)
- [x] Pending verifications (`pending_review` count) → links to queue
- [x] Awaiting payment (`pending_payment` count)
- [x] Verified wajakazi count
- [ ] Today's activity (approvals + rejections today) — `audit-logs`
- [ ] Queue preview (next 5 oldest submissions)

### Wajakazi (`/dashboard/mjakazi`) — already has completeness + status
- [ ] Verification expiry countdown (N days left when `verified`)
- [ ] Expressions of interest received — later (Phase 6.x)
- [ ] Directory visibility toggle — later (Phase 6.x)

### Waajiri (`/dashboard/mwajiri`) — currently placeholder
- [ ] Subscription status + days remaining → links to subscription
- [ ] Renew/upgrade CTA when expiring
- [ ] Directory CTA ("browse verified wajakazi") — later (Phase 6.1)
- [ ] Saved wajakazi / EOIs sent — later (Phase 6.x)

