# Memory — Phase 6.1 (Public directory) complete

Last updated: 2026-09-06 21:11

## What was built

Phase 6.1 — the public directory, end to end:

- `src/services/directory.service.ts` (new) — `listDirectoryProfiles` + `getDirectoryProfile`
  reading through the guarded path (`DIRECTORY_VISIBLE` + `overrideAccess: false` + an
  explicit `select`), filters (job category, location, experience bucket, free-text name
  search), sort `-verificationReviewedAt` (newest verified first), 9 per page.
- `slug` field on `wajakazi-profiles` + `hooks/ensure-slug.ts` (set-once `beforeChange` hook).
- `hooks/revalidate-profile.ts` (afterChange + afterDelete) mirroring the posts revalidation
  hook — revalidates `/directory`, `/directory/[slug]`, and a `directory-sitemap` tag.
- `src/app/(web)/directory/page.tsx` + `directory/[slug]/page.tsx` (dynamic server
  components) with `generateMetadata`.
- Components: `DirectoryCard`, `DirectoryFilterBar`, `DirectoryPagination`,
  `DirectoryProfileDetail`, `DirectoryProfileViewTracker` (fires `profile_viewed`).
- shadcn `Pagination` installed via CLI; `directory_searched` + `profile_viewed` PostHog
  events wired.

## Decisions made

- **Contact protection is payload-level, not UI** — the explicit `select` returns only
  `displayName, photo, jobsSkills, about, yearsExperience, educationLevel, languages,
  workPreference, availableFrom, salaryMin, salaryMax, location`. `phone`, `user`, legal
  name, DOB, nationality, marital status, religion are never selected.
- **`slug` is `index: true`, deliberately NOT `unique`** — a random 6-hex suffix guarantees
  practical uniqueness while avoiding a Mongo unique-index migration hazard for pre-existing
  null slugs. Set-once, so editing a profile never changes its URL.
- **Detail 404s** when the slug is unknown or the profile leaves the directory (hired / on
  break / expired) — the guarded read makes this automatic.
- **Experience filter = buckets** (0–2 / 3–5 / 6–9 / 10+); name search = `displayName`
  `contains`; pagination numbered, 9 per page, all via URL query params.
- **Sort is `-verificationReviewedAt`**, not `updatedAt`.

## Problems solved

- **Tailwind v4 `grid-cols-[minmax(...)]` arbitrary value generated NO CSS** — the detail
  grid silently stayed single-column (stacked). Replaced with standard `lg:grid-cols-3` +
  `lg:col-span-1`/`lg:col-span-2`. Lesson: use standard grid utilities in this repo.
- **shadcn CLI generated `pagination.tsx` with a broken `import { cn } from "cn"`** — fixed
  to `@/lib/utils`, and removed the stray `cn` dependency the CLI added to `package.json`.
- `payload.find` with `select` returns a narrowed type (not the full `WajakaziProfile`) —
  defined a `DirectoryProfile` `Pick` type in the service.
- Directory pages need `pt-24 pb-24` to clear the fixed 80px marketing header.
- Mobile right-edge overflow fixed with `min-w-0` (grid items) + `break-words` (name/about).
- Windows: use `pnpm.cmd` for every pnpm command.

## Current state

- **Phase 6.1 fully complete and verified** — profiles render newest-first; search/filter/
  pagination work; view-source + RSC payload confirmed **no phone/email leak**; stale links
  404; CMS `/directory` page deleted; header "Find Wajakazi" nav and the sitemap are wired.
- `pnpm lint` 0 errors, `pnpm build` green (only the pre-existing `any` warnings in
  `payment-timeout.ts` / `subscription-expiry.ts`).
- Slug backfill ran in dev and the `_scratch_backfill_profile_slugs.ts` scratch file was
  deleted.
- Phase 6.2 (Latest Verified Profiles block) was already done earlier as the
  `wajakazi-archive` marketing block.

## Next session starts with

Phase 6.3 (Mwajiri browse — `/dashboard/mwajiri/browse` + `browse/[id]`, masked without a
subscription, unlock affordances for subscribers) and 6.4 (Contact unlock —
`contact-unlocks` collection unique on (mwajiri, mjakazi), `services/contact.service.ts` as
the **only** place contact fields are read, `api/actions/contact/reveal`). Run `/architect`
first; re-check `context/build-plan.md` 6.3/6.4 and `context/progress-tracker.md`.

## Open questions

- 6.4's "block new reveals while `subscriptionState !== "active"`" logic (deferred from 5.3)
  still needs to be designed as part of the contact vault.
- Phase 5's deferred manual sandbox verification (STK push, callback replay idempotency,
  5.3 expiry job) may still be outstanding — confirm before Phase 7+.
