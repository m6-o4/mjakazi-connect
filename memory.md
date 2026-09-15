# Memory — Mjakazi employment history (planned, built, reviewed, verified)

Last updated: 2026-09-15 01:52 UTC

## What was built

**1. Employment history on the mjakazi profile — the queued 2.1 scope addition, now done**

Planned with `/architect` before any code. Five decisions settled with Michael first
(below), then built as a full vertical slice:

- `src/lib/profile-constants.ts` — `MAX_EMPLOYMENT_ENTRIES = 5` and
  `EMPLOYER_MAX_LENGTH = 80`, the one place each bound is defined.
- `src/payload/collections/wajakazi-profiles/schema.ts` — `employmentHistory` array
  (`maxRows: 5`), unindexed, sub-fields `employer` (text), `role` (select over
  `JOB_OPTIONS`), `startDate`, `endDate` (real `date` fields). `pnpm generate:types` run.
- `src/lib/profile-schema.ts` — `employmentEntrySchema`, the `employmentHistory` array,
  and the blanks/dates rules appended to the existing `superRefine`. Exports
  `isFilledEmploymentEntry` (plus module-local `isBlankEmploymentEntry`) and
  `CONTACT_DETAIL_PATTERNS` / `containsContactDetails`.
- `src/services/profile.service.ts` — `toProfileData` maps and filters the rows.
  Completeness logic untouched.
- `src/components/dashboard/mjakazi/profile-form/employment-history-field.tsx` — **new**
  `useFieldArray` editor: one block per row, Add disabled at 5, immediate Remove.
- `src/components/dashboard/mjakazi/profile-form/index.tsx` — renders it in the
  Professional card between years-of-experience/education and languages; `onInvalid`
  resolves a nested array error to that row's employer input.
- `src/components/dashboard/mjakazi/profile-form/form-select.tsx` and
  `form-date-picker.tsx` — `name` widened to explicit unions including
  `employmentHistory.${number}.*`, and `Controller` → `useController`.
- `src/app/(saas)/dashboard/mjakazi/profile/page.tsx` — seeds `initialValues`.
- `src/services/directory.service.ts` — `DIRECTORY_PUBLIC_FIELDS` (lists) split from the
  new `DIRECTORY_DETAIL_FIELDS` (adds `employmentHistory` by explicit subfield).
- `src/components/web/directory/directory-profile-detail.tsx` — read-only timeline,
  newest-first, month + year, `Africa/Nairobi` pinned, omitted when empty.

**2. Review pass on the uncommitted diff — 6 findings, all fixed**

`/review uncommitted` with all six tracks. Fixes: employer cap centralised; `employer` now
**rejects** Kenyan phone numbers and email addresses; the directory `select` split (list
vs detail); `formatMonthYear` pins the timezone; the admin description interpolates the
cap; two unused exports dropped.

**3. Identity card field order (cosmetic)**

`profile-form/index.tsx` — legal first and last names now share a row, date of birth moved
up beside the display name. Pure JSX reorder in the existing `grid gap-4 md:grid-cols-2`.
Rows: `display name | date of birth`, `legal first name | legal last name`,
`nationality | marital status`, `religion | mobile phone`.

**4. Docs updated**

`context/progress-tracker.md` (two 2026-09-15 entries + the toast verification line
corrected), `context/ui-registry.md` (`EmploymentHistoryField`, `FormSelect`,
`FormDatePicker`, `ProfileForm`, `DirectoryProfileDetail`), `context/build-plan.md` (2.1
scope addition marked built), `context/code-standards.md` (public free-text must reject
contact details; date-only values are UTC midnight so formatting pins the timezone),
`context/library-docs.md` (Payload nested `select`; the `react-hook-form` dotted-path
error trap; `date-fns` timezone note).

## Decisions made

- **Storage**: structured, 4 fields per entry. No "reason for leaving" — free text,
  sensitive, no hiring value.
- **Dates**: both required; `endDate >= startDate`; no future `startDate`; month + year
  displayed; newest-first, so no reorder UI.
- **Completeness**: deliberately **outside** `PROFILE_REQUIRED_FIELDS` and
  `PROFILE_UI_REQUIRED_FIELDS`. No asterisk, no effect on `profileComplete`, never blocks
  verification submission, and editing never triggers `revertToReview` — it is display
  content staff cannot verify.
- **Surfaces**: every profile-detail page, via the detail `select`. The public
  `/directory/[slug]` and the mwajiri browse detail share `DirectoryProfileDetail`, so
  there is no dashboard-only path. Detail pages only — no card shows it. Not
  subscription-gated (only phone and email are).
- **Editing**: forgiving. Add disabled at 5; immediate Remove, no `AlertDialog` (nothing
  persists until "Save profile"); a fully blank row is dropped on save; a partially-filled
  row errors.
- **Public free text is a contact-leak vector.** Any free-text field an unauthenticated
  read can reach must reject contact details; help text is not a control. Now in
  `code-standards.md`.
- **One `select` per read shape.** Sharing a single `select` across list and detail reads
  fetches the union, so a `DIRECTORY_DETAIL_FIELDS` that spreads the list set keeps one
  source of truth without the over-fetch.

## Problems solved

- **`role: JobValue | ""` vs Payload rejecting `""`.** zod's empty placeholder is not
  accepted by the select field. Solved with an `isFilledEmploymentEntry` type predicate
  that narrows `role` — not a cast.
- **Nested array paths cannot be read from `formState.errors`.** `errors["rows.0.role"]`
  is `undefined` even though the error exists, so `Controller` + `formState.errors[name]`
  would render no message while the form refused to submit. Solved by switching both
  shared field components to `useController` and reading `fieldState.error`. Recorded in
  `library-docs.md`.
- **"No future start date" misfires across midnight.** `new Date().toISOString()` is the
  UTC date, which is the previous day in Nairobi between 00:00 and 03:00 local, so a
  legitimate "today" would be rejected. Solved with `nairobiToday()` via
  `Intl.DateTimeFormat`.
- **Blank rows dropped twice, consistently.** Client and server both read one predicate,
  so they cannot disagree about what counts as an omitted row.
- **Nested `select` was the one unverifiable risk.** Could not exercise it against a live
  DB; confirmed by reading Payload's `getSelectMode` (it recurses into object-valued
  entries) and then settled by Michael's manual test — it works.
- **Timezone drift in month/year display.** Demonstrated empirically: `2021-03-01` renders
  `Mar 2021` under UTC and `Africa/Nairobi` but `Feb 2021` under `America/New_York`. Fixed
  by pinning the timezone.

## Current state

- Employment history is **built, reviewed, and verified by Michael** — "I have tested the
  new addition and it works fine." The identity field reorder is verified too.
- `pnpm lint` passes with 0 errors (1 pre-existing React-Compiler warning in
  `concierge-brief-form.tsx`); `pnpm build` compiles, type-checks and generates 49 pages.
  The `sharp` EPERM symlink warnings on Windows are known-harmless.
- The previous session's work is committed as
  `d9ce05a feat(dashboard): standardize action confirmations with toasts`. **This
  session's work is uncommitted by design** — Michael commits after `/remember save`, and
  that commit is expected to include `memory.md` and the updated context files along with
  the code (17 files changed plus the new `employment-history-field.tsx`). An uncommitted
  tree here is the expected end-of-session state, not an outstanding item.
- Nothing is queued for the next session. The feature backlog item for employment history
  is closed out in `build-plan.md`.

## Next session starts with

- **Nothing is in progress.** Confirm with Michael what to pick up next — do not resume
  employment history, it is done. Do not raise the uncommitted tree as an outstanding
  item: Michael commits after `/remember save`, so it is expected to be dirty at this
  point.
- Worth offering, since both were surfaced by this session and left for him to decide:
  promote the "public free-text must reject contact details" rule to a numbered invariant
  in `context/architecture.md` (it currently lives only in `code-standards.md`), and
  settle the carried-over profile-completeness inconsistencies in Open questions below.

## Open questions

- **Carried over, still unresolved:** `dateOfBirth` is identity data yet is neither
  starred nor in the completeness list; `displayName` is schema-required while
  `PROFILE_REQUIRED_FIELDS` omits it, and its helper text promises a first-name fallback
  that `toProfileData` does not implement.
- Should the public-free-text contact rule become a numbered invariant in
  `architecture.md`, or stay an implementation rule in `code-standards.md`?
- Deliberately not done: a blank row dropped on save stays on screen until reload, because
  `useForm` ignores new `defaultValues` after mount, so clearing it needs a `replace()`
  inside the field-array component plus a save signal from the parent. Michael has not
  asked for it.
- `employer` rejects Kenyan phone numbers and email addresses by pattern. If a real user
  hits a false positive, revisit the patterns in `profile-schema.ts` rather than removing
  the check.
