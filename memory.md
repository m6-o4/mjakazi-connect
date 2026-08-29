# Memory — Phase 1 (Auth Flow): Sign-up, Post-auth, Profiles, Dashboards

Last updated: 2026-08-29 04:40

## What was built

- **Phase 1.1 — Sign-up with role intent**
  - `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` — client component reading `?role=`, validating `mjakazi|mwajiri`, passing `unsafeMetadata`, redirecting bare/invalid to `/registration` (never guesses).
  - `src/app/(auth)/layout.tsx` — split-panel auth layout (sage brand panel + form), logo wired to `/mjakazi-connect.png`.
  - `/registration` chooser is CMS-managed via the `registration` block + `[slug]` route (not a hardcoded page).
  - `src/payload/blocks/registration/component.tsx` converted to shadcn `Card`.
  - Google OAuth removed (social button hidden on sign-up + sign-in; disabled in Clerk Dashboard). Email/password + Clerk email verification is the sign-up path.

- **Phase 1.2 — Post-auth promotion and dispatch**
  - `src/app/(auth)/post-auth/route.ts` — promotes `unsafeMetadata.role` to `publicMetadata.role` (allowlist `mjakazi|mwajiri` only) via `updateUserMetadata()`, nulls `unsafeMetadata`, resolves the Payload user with retry, redirects by role.

- **Phase 1.3 — Domain profiles**
  - `src/payload/collections/wajakazi-profiles/schema.ts` and `waajiri-profiles/schema.ts` (1:1 via a unique `user` relationship).
  - `src/services/identity.service.ts` with idempotent `ensureProfile()`, called from `/post-auth`.

- **Phase 1.4 — Route guards and dashboard shells**
  - `src/lib/roles.ts` — shared `VALID_ROLES`, `REGISTRATION_ROLES`, `DASHBOARD_BY_ROLE`, role type guards.
  - `src/app/(saas)/dashboard/layout.tsx` shell + `dashboard/[role]/page.tsx` role guard + `/dashboard` redirect.
  - `src/components/dashboard/{sidebar,topbar,sign-out-button}.tsx`.
  - `src/app/(payload)/layout.tsx` amended: non-staff → their own dashboard (session intact), not `/sign-out`.

## Decisions made

- `/registration` is CMS-managed, not a hardcoded route (`project-overview.md` updated accordingly).
- Never guess: bare `/sign-up` shows the chooser; no default role (a default would permanently misfile, since `role` is admin-only after creation).
- Google OAuth dropped (unreliable: loop + pre-filled create-account dialog). Email/password + email verification is the sign-up path.
- Sign-up forces redirect to `/post-auth`; sign-in does NOT (honors `redirect_url` so an admin returns to `/admin`, falls back to `/post-auth` for direct sign-in).
- Role constants live in `src/lib/roles.ts` (single source of truth).

## Problems solved

- `payload.create` for `waajiri-profiles` failed: `blacklistState` is `required: true` and its `defaultValue` does NOT make it optional in the generated create type — pass it explicitly.
- Clerk OAuth loop ("No sign up attempt was found"): an async server component for the sign-up page remounted `<SignUp>` on each internal hop, dropping the OAuth attempt. Fixed by making the sign-up page a client component — but Google OAuth was ultimately removed rather than fully debugged.
- `forceRedirectUrl="/post-auth"` on the sign-in page broke `/admin` (admin was dispatched to `/dashboard/admin` instead of returning to the Payload panel). Removed — sign-in now honors `redirect_url`.
- PowerShell execution policy blocks `pnpm.ps1`. Run pnpm via `& "C:\Users\Michael\AppData\Roaming\npm\pnpm.cmd" <cmd>` (e.g. `build`).

## Current state

- Phases 1.1–1.4 complete; `pnpm build` passes.
- Email/password sign-up works end-to-end: role promoted, `unsafeMetadata` cleared, profile created, dashboard shell + role guard working, graceful sign-out.
- `/admin` works for admin/staff; non-staff hitting `/admin` are redirected to their own dashboard with the session intact.
- Google OAuth disabled (button hidden + disabled in Clerk Dashboard).

## Next session starts with

- Phase 2.1 (Profile form): full `wajakazi-profiles` professional fields (jobsSkills, about, education, languages, salary, etc.), `app/actions/profile.ts`, the form at `/dashboard/mjakazi/profile`, `lib/profile-constants.ts`.

## Open questions

- Consolidate `VALID_ROLES` from the Clerk webhook + auth strategy into `src/lib/roles.ts` (currently still duplicated there).
- Phase 0.5 (PostHog) still deferred.
