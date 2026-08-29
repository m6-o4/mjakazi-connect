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
