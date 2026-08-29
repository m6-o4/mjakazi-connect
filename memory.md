# Memory — Phase 2.1 (Mjakazi Profile Form)

Last updated: 2026-08-29 19:57

## What was built

Phase 2.1 complete and verified (`pnpm build` passes, form saves + reloads, completeness computed).

- `src/lib/profile-constants.ts` — the 8 option lists (job skills, languages, countries, religion, marital status, work preference, education, locations) + `PROFILE_REQUIRED_FIELDS` (the 11-field completeness rule) + labels. Single source for schema options AND form AND checklist.
- `src/lib/phone.ts` — Kenyan phone normalize/validate (→ `254…`).
- `src/lib/profile-schema.ts` — shared zod schema: enums derived from the constants, `salaryMin <= salaryMax`, phone validation, `about` ≤ 200 words (`ABOUT_MAX_WORDS`/`countWords` exported).
- `src/payload/collections/wajakazi-profiles/schema.ts` — extended with all 17 identity/professional fields; `photo` → `profile-photos`.
- `src/payload/collections/profile-photos/schema.ts` (new) — upload collection (owner + staff + admin write, public read), registered in `collections/index.ts` and added to S3 storage in `plugins/schema.ts`.
- `src/services/profile.service.ts` — `getOwnProfile`, `updateProfile`, `uploadProfilePhoto`, `computeProfileComplete`, `getMissingRequiredFields`.
- `src/app/actions/profile.ts` — `updateProfileAction` Server Action (zod → service → revalidate).
- `src/app/(payload)/api/actions/profile/photo/route.ts` — photo upload route handler (5MB).
- `src/app/(saas)/dashboard/mjakazi/{layout,page}.tsx` — role-guard layout + dashboard home with completeness card; `dashboard/mjakazi/profile/page.tsx` — the form page.
- `src/components/dashboard/mjakazi/profile-form/*` — `index.tsx` (form), `form-select.tsx`, `option-chips.tsx` (multi-select chips), `photo-field.tsx`, `form-date-picker.tsx`.
- `src/components/dashboard/mjakazi/profile-completeness-card/index.tsx`.
- `src/lib/dashboard-nav.ts` + `src/components/dashboard/mobile-nav.tsx` — responsive dashboard shell (sidebar desktop-only, hamburger `Sheet` below `md`).
- `src/components/admin/get-current-user.ts` — wrapped in React `cache()` (one auth per request).
- `eslint.config.mjs` — ignores `**/.next/` and `design/`.

## Decisions made

- Completeness rule = v1's 11 fields with `phone` included; single source of truth in `PROFILE_REQUIRED_FIELDS`.
- Profile photo lives in its own `profile-photos` collection (public binary, owner-managed) — NOT the marketing `media` collection, NOT the Phase 2.2 `vault-documents`.
- Photo upload is a **route handler**, not a Server Action (Server Actions cap the request body at 1MB; photos are up to 5MB).
- `profileComplete` is field-locked to staff/admin, so the service writes it via a trusted `overrideAccess: true` write while user-editable fields go through `overrideAccess: false` + `req`.
- Photo persists immediately on upload (not on form save) — deliberate, more mistake-proof.
- Multi-select fields (`jobsSkills`, `languages`) use tap-to-toggle chips, not a dropdown (better for low-tech users).
- Field renames v1→v2 (locked in schema + types): `bio`→`about`, `jobs`→`jobsSkills`, `experience`→`yearsExperience`, `phoneNumber`→`phone`, `account`→`user`.

## Problems solved

- Hamburger menu invisible on mobile: `SheetTrigger render={<Button>…</Button>}` with children inside the render element dropped the icon. Fix: apply `buttonVariants` directly to `SheetTrigger`'s `className`.
- Date picker forced ~600 month-clicks to reach 1975. Fix: `captionLayout="dropdown"` on the shadcn `Calendar` (month + year selects).
- Tailwind v4 resets `<button>` to `cursor: default` (v3 was `pointer`). Fix: `cursor-pointer` on the `Button` base + `OptionChips`.
- `react-hooks/refs` lint error (useRef read in render) → switched the `profile_completed` "wasComplete" flag to `useState`.
- `react-hooks/incompatible-library` warning on `watch("about")` → `useWatch({ control, name })`.
- 3× `payload.auth` per request (shell layout + role layout + page) → React `cache()` on `getCurrentUser`.
- Full `pnpm lint` scanned `design/codebase/.next` and hung → `eslint.config.mjs` ignores `**/.next/` + `design/`.

## Current state

- Phase 2.1 fully working and developer-verified end to end (filled all fields, saved, data persisted).
- `pnpm build` passes; `pnpm lint` completes fast (0 errors; one pre-existing warning in `pages/schema.ts`).
- Mobile responsive: hamburger → sheet nav; form grids collapse to one column.
- `profile_completed` PostHog event fires client-side on the first false→true completeness transition.

## Next session starts with

- Phase 2.2 (Document vault): `vault-documents` collection (National ID + Certificate of Good Conduct, `signedDownloads: true`, owner + staff + admin read), the upload flow, and a page at `/dashboard/mjakazi/documents`. The completeness rule already gates on `photo`/`phone`; documents are the separate verification step that feeds the Phase 3 verification state machine.

## Open questions

- None blocking. Known harmless: `pnpm build` prints `EPERM/ENOENT` `sharp` symlink warnings during `output: standalone` tracing on Windows — ignore them.
- Contact-vault masking (Phase 6) still pending: `phone`/`email` are hidden from non-subscribers in the directory — not started.
