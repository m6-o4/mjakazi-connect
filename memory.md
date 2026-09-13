# Memory — Toast standardization + mjakazi profile required-field fix; employment history queued

Last updated: 2026-09-13 12:53

## What was built

**1. Mjakazi profile form — required-field semantics (Model A)**

- Required asterisks now derive from one exported list, `PROFILE_UI_REQUIRED_FIELDS`
  (`src/lib/profile-constants.ts`) = the completeness set plus `displayName`, and the legend
  was reworded to say they are needed for verification and that a partial profile can be
  saved.
- react-hook-form now validates on blur and re-validates on change (`mode: "onTouched"`),
  and a failed submit focuses the first invalid field.
- `updateProfile` (`src/services/profile.service.ts`) and `updateProfileAction`
  (`src/app/actions/profile.ts`) now return `missingFields`.
- No DB schema change, so no `generate:types`.

**2. App-wide toast convention — rollout complete (4 batches)**

- New `src/lib/notify.ts` (client-only): `notifySuccess` (5s), `notifyInfo` (8s),
  `notifyError` (high priority, no auto-dismiss), each taking an optional stable `id` so
  repeat actions upsert one toast instead of stacking.
- Mounted `<Toaster>` in `src/app/(saas)/layout.tsx`. The Base UI toast in
  `src/components/ui/toast.tsx` was already installed but had never been mounted.
- `ToastDescription` now renders a `<div>` instead of Base UI's default `<p>`, so a
  description can carry block content (the incomplete-profile toast uses a bulleted `<ul>`).
- Replaced four inline transient confirmations and two button-label "Saved" patterns; added
  success toasts to ~19 previously silent flows across admin, accounts, moderation, staff,
  mwajiri, mjakazi and settings.

New file: `src/lib/notify.ts`.
Key modified files: `src/app/(saas)/layout.tsx`, `src/components/ui/toast.tsx`,
`src/lib/profile-constants.ts`, `src/services/profile.service.ts`,
`src/app/actions/profile.ts`, and ~20 dashboard components (profile form, create-staff-form,
platform-settings-form, subscription-tiers-form, concierge-brief-form, edit-name-form,
staff-table, accounts-table, moderation-table, review-queue, review-form, eoi-send,
hire-confirm-card, concierge-status-card, submit-verification, resubmit-verification,
eoi-inbox, hire-inbox, availability-card, reviews-panel).
Docs: `context/progress-tracker.md` (Model A fix + Batch 1–4 entries),
`context/ui-registry.md` (`Toaster`, helper note, every touched component), and
`context/library-docs.md` (Shadcn/Base UI: `<Toaster>` must be mounted, the
`ToastDescription` `<p>` trap and its `<div>` override, and the "use the `notify*` helpers"
rule).

## Decisions made

- **Toast convention:** transient action confirmations use the `notify*` helpers, not
  `toast.add` directly. Success/info auto-dismiss; errors are high priority and stay until
  dismissed; repeatable actions pass a stable per-entity `id`.
- **Kept inline on purpose:** persistent state and field-level validation errors — payment
  notices, M-Pesa awaiting/timeout, document badges, contact reveal, Save/Saved toggle,
  availability status card, review "hidden" note, and form field errors.
- **Model A required-field semantics:** the `*` means "needed to complete/verify", not
  "required to save". Partial saves stay allowed; the schema enforces only real errors
  (phone format, 200-word cap, salary min/max ordering).
- Toasts survive `router.refresh()` / `router.push()` within the dashboard because
  `<Toaster>` lives in the `(saas)` layout.

## Problems solved

- The three-way "required" mismatch (form asterisks vs zod schema vs `profileComplete`)
  meant empty required fields saved silently. Resolved with Model A.
- A local review found that clearing the missing-fields list on photo upload could make an
  incomplete profile read as complete. The message is now built from the action result on
  each save, so that stale-state path no longer exists.
- Base UI renders `ToastDescription` as a `<p>`; putting a `<ul>` inside it was invalid HTML
  and would cause hydration issues. Fixed by rendering the description as a `<div>`.
- The original missing-fields notice sat below the fold. Replaced with toasts.
- The Base UI toast component was installed but never mounted, so `toast.add` was silently
  dropped. Fixed by mounting `<Toaster>` in the `(saas)` layout.

## Current state

- All changes pass `pnpm lint` (0 errors; 1 pre-existing React-Compiler warning in
  `concierge-brief-form.tsx`) and `pnpm build` (49 routes). The `sharp` EPERM symlink
  warnings on Windows are known-harmless.
- Michael manually verified everything through the toast rollout and reports it working and
  looking good.
- Nothing is committed this session; Michael commits after the remember-save loop, so commit
  status is not a concern.
- Employment history is not started.

## Next session starts with

- **Add an employment-history section to the mjakazi profile page where the mjakazi can list
  up to 5 previous employers.** Treat it as a new vertical slice: Payload field(s) on the
  `wajakazi-profiles` collection (+ `generate:types`) → service mapper + validation →
  profile form section and completeness. Settle the open questions below with Michael before
  writing code, and keep the usual loop (locate, propose, confirm, implement, `pnpm lint` +
  `pnpm build`, update `progress-tracker.md` / `ui-registry.md`).

## Open questions

- Employment entries: free-text, or structured (employer name, role, dates, reason for
  leaving)?
- Dates: start/end ranges, or just the most recent role? Any ordering or duplicate rules?
- Does employment history count toward `profileComplete` / verification (it is not in
  `PROFILE_REQUIRED_FIELDS` today), or is it optional display data?
- Does the section also appear on the public directory profile, or only on the dashboard
  profile form?
- Still open from before: `dateOfBirth` is identity data yet neither starred nor in the
  completeness list; `displayName` is schema-required while `PROFILE_REQUIRED_FIELDS` omits
  it, and its helper text promises a first-name fallback that `toProfileData` does not
  implement.
