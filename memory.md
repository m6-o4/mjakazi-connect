# Memory — Phase 6.3 + mwajiri browse/saved complete

Last updated: 2026-09-07 00:45

## What was built

**Phase 6.3 (Mwajiri browse)** — authenticated directory inside the dashboard:
- `src/app/(saas)/dashboard/mwajiri/browse/page.tsx` (list) and `browse/[slug]/page.tsx`
  (detail), reading the same guarded path as `/directory`
  (`listDirectoryProfiles`/`getDirectoryProfile`, `DIRECTORY_PUBLIC_FIELDS`,
  `overrideAccess: false`) — no contact fields ever selected.
- `src/components/dashboard/mwajiri/browse/browse-contact-card.tsx` — masked phone/email
  placeholder rows + subscription-aware affordance (disabled "Unlock contact details" for
  `active`, "Subscribe to unlock" link otherwise).

**Shared directory components parameterized (not forked)** — each new prop defaults to the
public-directory behavior so `/directory` can't regress:
- `directory-card.tsx`, `directory-filter-bar.tsx`, `directory-pagination.tsx` → `basePath`.
- `directory-profile-detail.tsx` → `backHref`, `contactSlot`, `headerAction`.

**Mwajiri dashboard overview** — `src/app/(saas)/dashboard/mwajiri/page.tsx` +
`subscription-status-card.tsx` (no-subscription notice + plan CTA, active tier + days
remaining, pending/restricted states), a live verified+available count card, quick actions.
"Browse wajakazi" buttons removed from the subscription card (redundant with the card below).

**Saved wajakazi (shortlist)** — completes browse → save → unlock funnel:
- `src/payload/collections/saved-wajakazi/schema.ts` (new collection: `user` + `mjakazi`
  relations, compound unique index), registered in `collections/index.ts`.
- `src/services/saved.service.ts` (`toggleSave`, `isSaved`, `listSavedProfileIds`).
- `src/app/actions/saved.ts` (`toggleSaveAction`).
- `src/components/dashboard/mwajiri/browse/save-toggle.tsx` (Save/Saved button).
- `src/app/(saas)/dashboard/mwajiri/saved/page.tsx` (saved list) + "Saved" nav item.
- `directory.service.ts` gained `listDirectoryProfilesByIds`.
- `code-standards.md` gained the `profile_saved` PostHog event.
- `payload-types.ts` regenerated.

## Decisions made

- **Bounded browse**: the actual reveal (`contact-unlocks` + `contact.service.ts` +
  `api/actions/contact/reveal`) is deferred to 6.4; the subscriber's unlock button stays
  disabled until then.
- **Parameterize, don't fork** the shared directory components.
- **Saved wajakazi**: free and pre-subscription; save from the browse detail only; dedicated
  `/dashboard/mwajiri/saved` page; stale saves (profile left the directory) silently drop
  out (list reads through the guarded directory path).
- `saved-wajakazi` uses a `user` (users) relation — not `waajiri-profiles` — so owner access
  is the clean `isAdminOrOwner("user")`.
- Saves write **no audit entry** (a preference, not a state transition); analytics via the
  `profile_saved` event.

## Problems solved

- Payload `select` does not include `id` (type error `SavedWajakaziSelect`): use a real field
  in `select` or omit it — `id` is always returned. Also always set `depth: 0` on
  `saved-wajakazi` reads so the `mjakazi`/`user` relationships stay id strings and never pull
  contact fields/emails into memory.
- Compound unique index in Payload 3: `indexes: [{ fields: ["user", "mjakazi"], unique: true }]`
  (`CompoundIndex = { fields: string[]; unique?: boolean }`, no `name`).

## Current state

- **Phase 6.3 complete and manually verified** (masked without subscription, subscriber sees
  disabled unlock, non-mwajiri redirected, view-source/RSC leaks no phone/email).
- Overview + saved wajakazi complete and working.
- `pnpm lint` 0 errors (only pre-existing `any` warnings in `payment-timeout.ts` /
  `subscription-expiry.ts`); `pnpm build` green.
- `progress-tracker.md`, `ui-registry.md`, `build-plan.md`, `code-standards.md` updated.

## Next session starts with

Phase 6.4 (Contact unlock) — the transaction the whole product exists to enable:
- `contact-unlocks` collection, unique on (mwajiri, mjakazi).
- `services/contact.service.ts` as the **only** place contact fields are read.
- `api/actions/contact/reveal` (atomic: unlock record + audit entry + return).
- Gate reveals on `subscriptionState === "active"`; unlocks are permanent; block new reveals
  while not active.
- Wire the disabled "Unlock contact details" button in `BrowseContactCard` to the reveal.
- Run `/architect` first; re-check `context/build-plan.md` 6.4 and `context/progress-tracker.md`.

## Open questions

- 6.4's "block new reveals while `subscriptionState !== "active"`" logic (deferred from 5.3)
  still needs to be designed as part of the contact vault.
- Phase 5's deferred manual sandbox verification (STK push, callback replay idempotency,
  5.3 expiry job) may still be outstanding — confirm before Phase 7+.
- Minor: "Extend" button in the subscription card is still the outline variant (it was the
  secondary action before "Browse wajakazi" was removed) — may want it promoted to primary.
