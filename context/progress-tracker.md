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
- **Notes**: Deferred due to operational constraints. Return to it before the
  Phase 12.2 PostHog sweep, or earlier if analytics must precede the first
  feature release.

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
  post-sign-up currently ends in a 404 by design. The existing `sign-in` page has
  no `appearance` styling; sign-up does, so the two are visually inconsistent —
  match sign-in as a follow-up.
