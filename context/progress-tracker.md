# Progress Tracker

## Purpose
A running log of work actually completed on this project — the historical
record, as opposed to `build-plan.md`'s forward-looking roadmap. Updated after
every feature is finished.

## How to Use
- **After completing a feature**: add an entry below with what was built.
- Cross-reference the corresponding item in `build-plan.md` if relevant.

## Log Entry Format

### [YYYY-MM-DD] — Feature Name
- **What was built**: brief description
- **Files touched**: key files/folders
- **Notes**: anything future work should know (decisions made, deviations from
  plan, known follow-ups)

---

## Log

### 2026-08-26 — Phase 0.1: Role enum migration
- **What was built**: Replaced the template's `admin | editor | user` with this
  project's `admin | staff | mwajiri | mjakazi`. Added `accountState`,
  `suspendedAt`, `suspensionReason`. Clerk sync hooks updated to drop the `user`
  fallback.
- **Files touched**: `src/payload/collections/users/schema.ts`,
  `src/payload/access/access-control.ts`, `src/payload/strategy/clerk-strategy.ts`,
  `src/payload/hooks/clerk-sync.ts`,
  `src/app/(payload)/api/webhooks/clerk/route.ts`, `src/payload.config.ts`
- **Notes**: Strict role enforcement — no default value, required field. No
  occurrence of `"editor"`, `"user"` as a role, or `isAuthenticatedOrPublished`
  remains. Bootstrap admin `publicMetadata.role` still needs verifying in the
  Clerk Dashboard.

### 2026-08-26 — Phase 0.2: Dependencies and environment
- **What was built**: Installed project dependencies and verified `.env`
  configuration against `.env.example`.
- **Files touched**: `package.json`, `.env.example`
- **Notes**: PostHog keys deferred to Phase 0.5 (skipped). `pnpm build` passes.

### 2026-08-26 — Phase 0.3: Design tokens
- **What was built**: Implemented brand design tokens (light and dark) and wired
  Plus Jakarta Sans via `next/font`.
- **Files touched**: `src/globals.css`
- **Notes**: Every token in `ui-tokens.md` resolves; no hardcoded hex anywhere.

### 2026-08-26 — Phase 0.4: Audit logging
- **What was built**: `audit-logs` collection (immutable) and `writeAuditLog()`
  utility. Renamed `isAdminOrSA` to `isAdminOrStaff`.
- **Files touched**: `src/payload/collections/audit-logs/schema.ts`,
  `src/payload/collections/index.ts`, `src/lib/audit.ts`
- **Notes**: Fixed `@payload-config` import path in `src/lib/audit.ts` via TS path
  mapping.

### 2026-08-26 — Phase 0.5: PostHog (skipped)
- **Notes**: Deferred due to operational constraints. Completed 2026-08-29 (see
  entry below).

### 2026-08-28 — Phase 1.1: Sign-up with role intent
- **What was built**: Clerk sign-up page reading `?role=`, validating against
  `mjakazi | mwajiri`, and passing it as `unsafeMetadata`. Bare/invalid `?role=`
  redirects to `/registration` — never guesses. The `/registration` chooser itself
  is served by the existing CMS `registration` block via the `(web)/[slug]` route
  (no dedicated page).
- **Files touched**: `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`,
  `src/payload/blocks/registration/component.tsx` (converted to shadcn `Card`)
- **Notes**: `/registration` is CMS-managed (per `project-overview.md`), not
  hardcoded. Sign-up redirects to `/post-auth`, which does not exist until 1.2 —
  post-sign-up currently ends in a 404 by design. Google OAuth was unreliable
  (Clerk's OAuth flow kept looping and, when it did progress, fell back to a
  pre-filled create-account dialog), so the social button is now hidden on both
  sign-up and sign-in — email/password with Clerk's email verification is the
  sign-up path. To fully cut off OAuth, disable the Google social connection in
  the Clerk Dashboard. Sign-in now has the same `appearance` as sign-up and no
  `forceRedirectUrl` (it honors `redirect_url`, so an admin signing in returns to
  `/admin`).

### 2026-08-28 — Phase 1.2: Post-auth promotion and dispatch
- **What was built**: `(auth)/post-auth/route.ts` — the single server-side path
  that turns declared intent into an authorized role. Reads `publicMetadata.role`
  and `unsafeMetadata.role`; uses an existing valid role as-is (never overwrites);
  otherwise promotes `unsafeMetadata.role` only when it is in the typed
  `mjakazi | mwajiri` allowlist, nulls `unsafeMetadata`, then resolves the Payload
  user with retry and redirects by role.
- **Files touched**: `src/app/(auth)/post-auth/route.ts`
- **Notes**: Uses `updateUserMetadata()` (the `updateUser()` metadata path is
  deprecated in `@clerk/backend` 3.16). Promotion allowlist is `mjakazi | mwajiri`
  only, so `?role=admin` cannot self-escalate. Redirect targets are
  `/dashboard/{role}`, which don't exist until 1.4 — metadata promotion is
  verifiable now, end-to-end dashboard landing after 1.4. `VALID_ROLES` is
  duplicated across the webhook, strategy and here — consolidate into a shared
  helper at some point.

### 2026-08-28 — Phase 1.3: Domain profiles
- **What was built**: `wajakazi-profiles` and `waajiri-profiles` collections
  (1:1 via a unique `user` relationship), and `services/identity.service.ts` with
  idempotent `ensureProfile()` called from `/post-auth` on every sign-in. Creates
  the right profile kind for the role, and never a duplicate.
- **Files touched**: `src/payload/collections/wajakazi-profiles/schema.ts`,
  `src/payload/collections/waajiri-profiles/schema.ts`,
  `src/services/identity.service.ts`, `src/payload/collections/index.ts`,
  `src/app/(auth)/post-auth/route.ts`
- **Notes**: Only the identity/state core was built (user, displayName,
  verificationState, availabilityStatus, profileComplete for wajakazi; user,
  phone, location, blacklistState, blacklistedAt for waajiri). The full
  professional profile fields land in 2.1. `ensureProfile` runs on every sign-in,
  so a profile missed during sign-up (webhook lag) self-heals on the next visit.
  Requires `pnpm build` (regenerates `payload-types.ts`).

### 2026-08-29 — Phase 1.4: Route guards and dashboard shells
- **What was built**: `(saas)/dashboard` shell (sidebar + topbar + user chip +
  graceful sign-out), a dynamic `[role]` dashboard route with a role guard, and
  `/dashboard` redirecting to the caller's role. `(payload)/layout.tsx` now sends
  non-staff to their own dashboard (session intact) instead of `/sign-out`.
- **Files touched**: `src/app/(saas)/dashboard/layout.tsx`,
  `src/app/(saas)/dashboard/page.tsx`, `src/app/(saas)/dashboard/[role]/page.tsx`,
  `src/components/dashboard/{sidebar,topbar,sign-out-button}.tsx`,
  `src/lib/roles.ts`, `src/app/(payload)/layout.tsx`,
  `src/app/(auth)/post-auth/route.ts`
- **Notes**: Extracted `VALID_ROLES` / `REGISTRATION_ROLES` / `DASHBOARD_BY_ROLE`
  / role type guards into `src/lib/roles.ts` (shared by post-auth, dashboard
  guard, and payload layout). Sign-out uses `useClerk().signOut({ redirectUrl:
  "/" })` (client-side). Dashboard content is a placeholder — real per-role pages
  land in later phases.

### 2026-08-29 — Phase 0.5: PostHog (completed)
- **What was built**: Installed PostHog via the official wizard and confirmed
  working. Client-side `posthog-js` initialized in `instrumentation-client.ts`
  (root); identify/reset wired into the theme provider and sign-out; a
  `registration_started` capture in the registration block. `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`
  and `NEXT_PUBLIC_POSTHOG_HOST` documented in `.env.example` and set in `.env`.
- **Files touched**: `instrumentation-client.ts`, `package.json`,
  `src/components/providers/theme-provider.tsx`,
  `src/app/(auth)/sign-out/page.tsx`,
  `src/components/dashboard/sign-out-button.tsx`,
  `src/payload/blocks/registration/component.tsx`, `.env.example`,
  `pnpm-workspace.yaml`
- **Notes**: Client-side only — no `posthog-node` server SDK yet. Fixed a `pnpm
  build` failure: `pnpm-workspace.yaml` had `core-js: set this to true or false`
  (a literal placeholder) under `allowBuilds`, which pnpm treats as unapproved and
  blocks `core-js`'s postinstall; changed to `core-js: true`. Package audit: Inngest
  is not installed or referenced in `src/` (Payload's own jobs queue is the
  pipeline); Clerk webhooks use `@clerk/nextjs/webhooks` `verifyWebhook`, not raw
  `svix` (svix never installed). Unused deps flagged for cleanup: `dotenv`,
  `@aws-sdk/client-s3` (transitive via `@payloadcms/storage-s3`), `jsdom`; plus
  `date-fns`, `react-hook-form`, `@hookform/resolvers`, `zod` (installed ahead of
  Phase 2.1).

### 2026-08-29 — Phase 2.1: Profile form
- **What was built**: The full mjakazi profile form at `/dashboard/mjakazi/profile`
  (identity + professional + work sections) with react-hook-form + zod, plus the
  mjakazi dashboard home showing a completeness card (progress + checklist). A
  separate photo upload (route handler, 5MB) persists the photo immediately.
  `profileComplete` is recomputed on every save from the 11 required fields.
- **Files touched**: `src/lib/profile-constants.ts` (new), `src/lib/phone.ts`
  (new), `src/lib/profile-schema.ts` (new), `src/services/profile.service.ts`
  (new), `src/app/actions/profile.ts` (new),
  `src/app/(payload)/api/actions/profile/photo/route.ts` (new),
  `src/app/(saas)/dashboard/mjakazi/{layout,page}.tsx` (new),
  `src/app/(saas)/dashboard/mjakazi/profile/page.tsx` (new),
  `src/components/dashboard/mjakazi/profile-form/*` (new),
  `src/components/dashboard/mjakazi/profile-completeness-card/index.tsx` (new),
  `src/payload/collections/profile-photos/schema.ts` (new),
  `src/payload/collections/wajakazi-profiles/schema.ts` (extended),
  `src/components/dashboard/sidebar.tsx` (Profile nav item)
- **Notes**: Field names follow `architecture.md` (`jobsSkills`, `about`,
  `yearsExperience`, `phone`, etc. — the v1 `bio`/`jobs`/`experience`/`phoneNumber`
  are renamed). Completeness rule = v1's 11 fields with `phone` included, single
  source of truth in `PROFILE_REQUIRED_FIELDS`. Profile photo is a new
  `profile-photos` upload collection (public binary, owner-managed), NOT the
  marketing `media` collection and NOT the (Phase 2.2) `vault-documents`. Photo
  upload is a route handler, not a Server Action, because Server Actions cap the
  request body at 1MB. `profileComplete` is field-locked to staff/admin, so the
  service writes it via a trusted `overrideAccess: true` write while user-editable
  fields go through `overrideAccess: false` + `req`. `profile_completed` PostHog
  event fires client-side on the first false→true completeness transition. Phone
  numbers are normalized to `254…` in `lib/phone.ts`. Date fields use a shadcn
  `Calendar`/`Popover` picker (`react-day-picker`, added via the CLI) for
  consistency. Made the dashboard shell mobile-responsive: the sidebar is now a
  desktop-only rail (`hidden md:flex`) and the same nav lives in a hamburger
  `Sheet` (`MobileNav`) in the topbar below `md`; nav items are shared via
  `src/lib/dashboard-nav.ts`. `about` is capped at 200 words (shared
  `ABOUT_MAX_WORDS`/`countWords` in `lib/profile-schema.ts` + a live counter in
  the form). Buttons use `cursor-pointer` (Tailwind v4 resets `<button>` to
  `cursor: default`). Follow-ups: `getCurrentUser` wrapped in React `cache()` so
  the shell layout + role layout + page authenticate once per request; and
  `eslint.config.mjs` now ignores `**/.next/` + `design/` so `pnpm lint` stops
  scanning the v1 reference codebase's build output.

### 2026-08-30 — Phase 2.2: Document vault
- **What was built**: `vault-documents` upload collection (sealed create/update/delete,
  `read` = owner + staff + admin scoped by `uploadedBy`), registered in S3 with
  `signedDownloads: true` (private ACL, no public object path). Upload, replace,
  view and delete flow at `/dashboard/mjakazi/documents`. Documents are delivered
  only through `GET /api/actions/vault/{id}`, which authorizes (role + ownership)
  and writes a `document_viewed` audit entry before redirecting to a 60s signed
  URL. Added `document_uploaded` / `document_deleted` / `document_viewed` audit
  actions.
- **Files touched**: `src/lib/vault.ts` (new), `src/lib/s3.ts` (new),
  `src/payload/collections/vault-documents/schema.ts` (new),
  `src/services/vault.service.ts` (new),
  `src/app/(payload)/api/actions/vault/route.ts` (new),
  `src/app/(payload)/api/actions/vault/[id]/route.ts` (new),
  `src/app/(saas)/dashboard/mjakazi/documents/page.tsx` (new),
  `src/components/dashboard/mjakazi/document-vault/index.tsx` (new),
  `src/payload/collections/index.ts`, `src/payload/plugins/schema.ts`,
  `src/lib/audit.ts`, `src/payload/collections/audit-logs/schema.ts`,
  `src/lib/dashboard-nav.ts`, `src/app/(saas)/dashboard/mjakazi/page.tsx`
- **Notes**: One file per document type (`national_id`,
  `certificate_of_good_conduct`); re-upload replaces (create-then-delete). 5MB
  cap, PDF/JPEG/PNG/WebP only. Delivery is redirect-to-signed-URL (the v1-proven
  pattern) rather than proxy-streaming. `@aws-sdk/s3-request-presigner` added as
  a direct dependency (was already transitive via `@payloadcms/storage-s3`).
  Documents do not feed `profileComplete` — they are the separate verification
  step. The `pending_review` lock on edits is deferred to Phase 3.2/4.4.
  `documents_uploaded` PostHog event fires when both slots fill. `pnpm build`
  passes (only the known-harmless `sharp` EPERM symlink warnings on Windows).
  **Manual verification (2026-08-31)**: both documents uploaded ✓; view link
  401 signed-out / 404 other-Mjakazi ✓; staff/admin document view deferred to
  Phase 3.3 (review queue).

### 2026-08-31 — Staff + account management (basics, pulled forward)
- **What was built**: Admin staff management at `/dashboard/admin/staff` — create,
  list, rename and delete staff, with Payload retained as the silent fallback.
  Wajakazi/Waajiri account management at `/dashboard/accounts/{wajakazi,waajiri}`
  — list + rename (admin + staff), admin-only delete with full cascade (documents
  → profile → photo → user → Clerk).
- **Access change**: `users.read` relaxed to `isAdminOrStaffOrSelf` so staff see
  name/email/role/state; `users.update` is the new `isAdminOrStaffOrSelfAccountEdit`
  (staff edit SaaS accounts only); `clerkId` and `password` are now admin-only.
  Invariant #18 and the access-control docs updated to match.
- **Files touched**: `access-control.ts`, `users/schema.ts`, `staff.service.ts`
  (new), `accounts.service.ts` (new), `app/actions/staff.ts` (new),
  `app/actions/accounts.ts` (new), `dashboard/admin/staff/page.tsx` (new),
  `dashboard/accounts/{wajakazi,waajiri}/page.tsx` (new),
  `components/dashboard/admin/{create-staff-form,staff-table,edit-name-form}` and
  `components/dashboard/accounts/accounts-table` (new), `dashboard-nav.ts`,
  `architecture.md`, `library-docs.md`.
- **Notes**: Moderation (suspend/reinstate/blacklist) deliberately deferred —
  account state transitions land in Phase 10.1. "Edit" means rename
  (first/last name); email is locked after creation. Staff manage SaaS accounts
  but never back-office accounts. `pnpm build` passes.

### 2026-08-31 — Audit log viewer + fixes
- **What was built**: Read-only audit log viewer at `/dashboard/audit-logs`
  (admin + staff) — filter by action/source, pagination, actor → target display,
  flattened metadata, mobile-responsive card-list. Replaces the v1 `<Table>` with
  the `divide-y` row pattern used by the accounts lists.
- **Fixes**: `clerk-sync.ts` now sends `legalAcceptedAt: new Date()` (staff
  creation was failing with a 422). Waajiri delete confirmation wording corrected
  (no "documents" clause). `/post-auth` stays a route handler returning the
  redirect target, and a new `/authenticating` wait page ("Signing you in…" /
  "Creating your account…") fetches it client-side before navigating;
  sign-in/sign-up now `forceRedirectUrl` to `/authenticating?action=…` (a first
  attempt used a Suspense + `redirect()` page and hung, so it was reverted).
  Renamed `isAdminOrSelfOrStaffAccountEdit` → `isAdminOrStaffOrSelfAccountEdit`.
- **Files touched**: `components/dashboard/audit-logs/audit-log-table.tsx` (new),
  `(saas)/dashboard/audit-logs/page.tsx` (new), `components/auth/{authenticating,post-auth-resolver}.tsx`
  (new), `(auth)/post-auth/page.tsx` (new), `dashboard-nav.ts`, `clerk-sync.ts`,
  `accounts-table.tsx`, the accounts pages, sign-in/up pages.

### 2026-09-01 — Phase 3.1: Verification state machine
- **What was built**: `services/verification.service.ts` — the eight-state
  verification state machine as an explicit transition whitelist, with ten
  exported transition functions (`submitForVerification`, `resubmitForVerification`,
  `renewVerification`, `advanceToReview`, `approveVerification`,
  `rejectVerification`, `revertToReview`, `expireVerification`, `blacklistProfile`,
  `deactivateProfile`). Each is guarded on actor role + current state and writes
  an audit entry with first-class `previousState`/`newState`/`reason`. Every
  transition is a compare-and-swap (0 docs updated → `conflict`). No payment
  wiring, no UI, no bypass — `advanceToReview` (`pending_payment → pending_review`)
  has no caller until Phase 4.4.
- **Schema**: `wajakazi-profiles` gained `verificationSubmittedAt`,
  `verificationReviewedAt`, `verificationExpiry`, `verificationAttempts`,
  `lastVerificationPaymentId`, `blacklistedAt`, `deactivatedAt`, `rejectionReason`,
  `verificationNotes` (all field-locked to staff/admin). `audit-logs` gained
  `previousState`/`newState`/`reason` and six new actions
  (`verification_advanced`, `verification_resubmitted`, `verification_reverted`,
  `verification_expired`, `verification_blacklisted`, `verification_deactivated`);
  `lib/audit.ts` extended to match.
- **Files touched**: `services/verification.service.ts` (new),
  `payload/collections/wajakazi-profiles/schema.ts`,
  `payload/collections/audit-logs/schema.ts`, `lib/audit.ts`, `payload-types.ts`
  (regenerated).
- **Notes**: The transition graph corrects the product spec — rejection is free
  to retry (`rejected → pending_review`) up to 3 rejections, and the 4th forces a
  fresh fee (`rejected → pending_payment`); `verificationAttempts` resets to 0 on
  the next confirmed payment. `verified → pending_review` exists for legal-name/ID
  change (no caller yet). Expiry is 12 months via `date-fns addMonths`.
  `blacklisted` and `deactivated` are terminal. Verified with a throwaway `tsx`
  scratch script (21/21 legal + illegal transitions passed), then deleted.
  `pnpm lint` (0 errors) and `pnpm build` pass. Open: the `verified → pending_review`
  identity-change *trigger* (profile/document-edit detection) and the "fresh
  Certificate" renewal check land in later phases.

### 2026-09-01 — Phase 3.2: Submit for verification
- **What was built**: The verification page at `/dashboard/mjakazi/verification`,
  state-aware across all eight verification states. The `draft` state renders a
  readiness checklist (profile complete + both documents) with a submit button
  wired to `submitForVerification` via a Server Action; every other state renders
  correct status copy with no action buttons yet. The `pending_payment` state is
  an honest "awaiting payment" card with no price or pay button (payment lands in
  Phase 4.4, the fee in `platform-settings`). Added the "Verification" nav item
  and linked the overview `VerificationStatusCard` "ready" state to the new page.
- **Files touched**: `app/actions/verification.ts` (new),
  `app/(saas)/dashboard/mjakazi/verification/page.tsx` (new),
  `components/dashboard/mjakazi/verification/submit-verification.tsx` (new),
  `components/dashboard/mjakazi/verification/verification-state.tsx` (new),
  `lib/dashboard-nav.ts`, `components/dashboard/mjakazi/verification-status-card/index.tsx`,
  `context/ui-registry.md`.
- **Notes**: Submit is a Server Action (not a route handler) per the
  "prefer a Server Action" rule. `verification_submitted` PostHog event fires
  client-side on success; the `verification_submitted` audit entry is written
  inside the service transition. Resubmit (`resubmitForVerification`) and renew
  (`renewVerification`) are deliberately not wired — `rejected` and
  `verification_expired` are unreachable until Phases 3.3 / 7.1. No schema change,
  so no `generate:types` needed.
