# Memory — Phase 6.2 complete

Last updated: 2026-09-06 22:30

## What was built

Phase 6.2 (Latest Verified Profiles block) — refactored the existing `wajakazi-archive`
marketing block so it reads through the guarded `listDirectoryProfiles` service and renders
`DirectoryCard` (identical to `/directory`):

- `src/payload/blocks/wajakazi-archive/component.tsx` — now calls
  `listDirectoryProfiles(payload, { limit: 3 })`, renders `DirectoryCard`, keeps
  headline/description/View-all/empty-state chrome.
- `src/payload/blocks/wajakazi-archive/schema.ts` — removed `limit`, `buttonLink`,
  `buttonText`.
- `src/components/web/wajakazi-teaser-card.tsx` — deleted (was only used by the block).
- `src/services/directory.service.ts` — added optional `limit` to `listDirectoryProfiles`
  (defaults to `DIRECTORY_PAGE_SIZE`).
- `src/payload/collections/wajakazi-profiles/hooks/revalidate-profile.ts` — added
  `revalidatePath("/")` to both hooks.
- `src/payload-types.ts` — removed the three fields from `WajakaziArchive` +
  `WajakaziArchiveSelect` (hand-edited, not regenerated).
- `src/app/(web)/directory/[slug]/page.tsx` — top padding `pt-24` → `pt-32` (matches the
  `/directory` list page; detail was too close to the fixed nav).
- `context/progress-tracker.md` + `context/ui-registry.md` updated.

Also a date-fns cleanup pass: replaced raw millisecond arithmetic/comparisons with
date-fns across `src/payload/utilities/format-date.ts` (`differenceInDays/Hours/Minutes` +
`format`), `src/components/dashboard/staff/verifications/review-form.tsx`
(`differenceInDays`), `src/services/payment.service.ts` (`subMinutes`), `src/lib/mpesa.ts`
(`addSeconds`), `src/services/verification.service.ts` and
`src/services/subscription.service.ts` (`isAfter`).

## Decisions made

- The block now reads the **guarded path** (`overrideAccess: false` + `DIRECTORY_VISIBLE`
  + public `select`) instead of the old `overrideAccess: true` hand-rolled query.
- Homepage block is **hardcoded to 3**, latest-verified sort `-verificationReviewedAt`.
- `WajakaziTeaserCard` deleted; the directory's `DirectoryCard` is now the single card.
- Left timezone-aware renderers alone (`toLocaleDateString`/`Intl.DateTimeFormat` with
  `Africa/Nairobi`, and `profile/page.tsx`'s `toISOString().slice(0,10)`) — plain
  date-fns can't reproduce them without `@date-fns/tz`, which is not a direct dependency.

## Problems solved

- **The homepage is SSG, not per-request dynamic** — an earlier 2026-09-04 note claimed the
  `(web)` route re-fetches every render via `draftMode()`, but the build shows `/` as
  `○ (Static)`. The block would never refresh on verification. Fixed with
  `revalidatePath("/")` in `revalidate-profile.ts`.
- `@ianvs/prettier-plugin-sort-imports` normalizes import grouping — run
  `pnpm exec prettier --write` on edited files, or lint/build will complain about ordering.

## Current state

- **Phase 6.1 complete. Phase 6.2 complete and manually verified** (verify a profile →
  reload homepage → new profile appears; card links to detail page).
- `pnpm lint` 0 errors (only pre-existing `any` warnings in `payment-timeout.ts` /
  `subscription-expiry.ts`), `pnpm build` green.
- date-fns refactor done, prettier clean.

## Next session starts with

Phase 6.3 (Mwajiri browse — `/dashboard/mwajiri/browse` + `browse/[id]`, masked without a
subscription, unlock affordances for subscribers) then 6.4 (Contact unlock —
`contact-unlocks` collection unique on (mwajiri, mjakazi), `services/contact.service.ts` as
the **only** place contact fields are read, `api/actions/contact/reveal`). Run `/architect`
first; re-check `context/build-plan.md` 6.3/6.4 and `context/progress-tracker.md`.

## Open questions

- 6.4's "block new reveals while `subscriptionState !== "active"`" logic (deferred from 5.3)
  still needs to be designed as part of the contact vault.
- Phase 5's deferred manual sandbox verification (STK push, callback replay idempotency,
  5.3 expiry job) may still be outstanding — confirm before Phase 7+.
