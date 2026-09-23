# Memory — Interest-gated contact reveal built; validated on Essentials and Standard

Last updated: 2026-09-23 11:54 UTC

## What was built

**The core change: a subscription no longer hands over mjakazi contacts.** Contact is now
shared only after the mjakazi accepts an expression of interest, and that grant is
permanent.

- **Phone display sweep (first thing this session).** `src/lib/phone.ts` gained
  `formatKenyanPhone` — canonical `254XXXXXXXXX` → local `0XXXXXXXXX`, a local value
  passes through, anything unrecognised is returned untouched. `normalizeKenyanPhone` is
  unchanged and still canonicalises on submit. Wired at the three server pages that seed
  an input: `mjakazi/profile/page.tsx`, `mjakazi/verification/page.tsx`,
  `mwajiri/subscription/page.tsx`.
- **Policy settings.** `platform-settings` gained an `eoiPolicy` group — `minBatch` (1),
  `maxBatch` (5), `responseThresholdPercent` (50), `expiryDays` (7), `resendCooldownDays`
  (14). Read by `getEoiPolicy` / written by `updateEoiPolicy` (`settings.service.ts`),
  action in `app/actions/settings.ts`, edited by new
  `components/dashboard/admin/settings/eoi-policy-form.tsx` on the admin settings page.
- **Grant provenance.** `contact-unlocks` gained `source`
  (`eoi | concierge | subscription_reveal`) and `sourceEoi`. An accepted interest creates
  the grant; `concierge.service.ts` now tags its grants `source: "concierge"`.
- **Retired manual reveal.** Deleted `revealContact` (was in `contact.service.ts`),
  `revealContactAction` and the whole file `src/app/actions/contact.ts`. Added
  `grantContactFromEoi` in `contact.service.ts`.
- **EOI service (`src/services/eoi.service.ts`).** `sendEoiBatch` enforces the policy
  bounds, the open-pool gate, the re-send cooldown, and refuses recipients who already
  have an open interest, a grant or a live hire. `respondToEoi` pre-creates the grant and
  rolls it back if its compare-and-swap loses. New read helpers for the UI:
  `getEoiSendEligibility`, `getProfileInterestStatus`, `listUnavailableForInterest`.
  `expireUnansweredEois` reads the policy window. `listSentEois` and `loadProfileDisplay`
  now carry the profile `slug`.
- **UI.** `BrowseContactCard` became the interest control (send / interest-sent /
  subscribe CTA / gate-or-cooldown reason). `EoiSend` takes policy bounds + a
  server-computed `canSend`. The shortlist page filters out pairs that cannot receive
  another batch. The public detail, subscription card, subscription page and acceptance
  email copy were rewritten. **Interface pass:** nav + page title "Saved" →
  **"Shortlist"**, the browse-detail toggle now **"Shortlist" / "Shortlisted"**, the
  sent-interests card moved **above** the hire-confirmation card on the mwajiri overview,
  accepted EOIs got a **"View profile"** link, and a singular/plural sweep landed (one
  mjakazi, many wajakazi — including `wajakazi-profiles` admin labels now "Wajakazi
  Profiles").
- **Hire.** `confirmHire` (`hire.service.ts`) no longer requires an active subscription —
  a grant is enough.
- **Audit.** Added `contact_granted` (+ its label-map entry in `audit-log-table.tsx`).
- **Docs.** `architecture.md` (invariant #14, data models, platform-settings + jobs
  tables), `build-plan.md` (6.4 superseded, 8.1 changed + validated live),
  `code-standards.md` (dropped `contact_unlocked` from the PostHog table),
  `ui-registry.md` (new `EoiPolicyForm`; `BrowseContactCard`, `EoiSend`, `SaveToggle`
  rewritten), `progress-tracker.md`.

## Decisions made

- **Accepted EOI is the only path to contact.** The subscription gates _sending interest_
  and browsing, never the contact itself. The manual subscription-gated Reveal is retired.
- **Gate = more than the threshold (default 50%) of the open pool resolved.** The pool is
  every interest in a batch that still has an unanswered member, resolved siblings
  included; a batch drops out once fully resolved. Expiry counts as resolved, so a batch
  can never stall a mwajiri past the window.
- **Rejection _or_ expiry starts the 14-day re-send cooldown.** Acceptance is permanent —
  a mjakazi cannot revoke.
- **No introduction message** on an EOI; contact delivered in-app with a cue email that
  never contains the contact.
- **Every EOI number lives in `platform-settings.eoiPolicy`** — nothing hardcoded.
- **Existing subscription-era grants are grandfathered** (pre-production; no migration
  shipped).
- **Concierge still grants contacts directly** and bypasses the gate. Deliberately left
  untouched — Michael deferred the concierge rework. **This is the next test.**
- `contact_unlocked` no longer fires anywhere (the reveal that emitted it is gone), so it
  was removed from the PostHog table in `code-standards.md`.

## Problems solved

- **Payload `select` narrows the returned doc type and cannot include `id`.**
  `select: { id: true }` is a type error; a full collection type no longer matches a
  narrowed result. Use `Pick<ExpressionsOfInterest, "id" | "batchId" | "state">` for
  selected rows.
- **An acceptance must never land without its grant.** `respondToEoi` creates the grant
  before the compare-and-swap and deletes it again if the CAS loses; `grantContactFromEoi`
  is idempotent (unique index + existence check) so a legacy unlock or a concurrent create
  short-circuits.
- **`pnpm build` leaves generated files in Payload's raw style** — re-run prettier on
  `src/payload-types.ts` and `src/app/(payload)/admin/importMap.js` after every build.
- **`pnpm format` / `pnpm build` piped through `Select-Object` can report a non-zero exit
  (EPIPE) even on success.** Run prettier directly to confirm a real exit code.
- **A build failed once with `Zone Allocation failed - process out of memory`; a plain
  retry succeeded** — transient machine memory pressure, not a code fault.

## Current state

- `pnpm build` passes with **50 routes**; `src` lints clean (0 errors; the one
  pre-existing React-Compiler warning in `concierge-brief-form.tsx`). Types regenerated
  via `pnpm generate:types`.
- **Michael validated the interest-gated flow live on the Essentials and Standard plans**
  — browse → send interest → accept → contact visible, with the gate, cooldown and
  admin-editable policy all behaving.
- **Everything from this session is uncommitted** (his convention: he commits after
  `/remember save`). Includes the phone sweep, the whole interest-gate change set, the
  interface pass and the context docs. One untracked file:
  `src/components/dashboard/admin/settings/eoi-policy-form.tsx`. One deletion:
  `src/app/actions/contact.ts`.
- `pnpm` must be invoked as `pnpm.cmd` in this shell (PowerShell execution policy).
- Full `pnpm lint` also reports errors inside `.kilo/worktrees/fortune-trigonometry/` — an
  Agent Manager worktree the ESLint config does not ignore; not our code.

## Next session starts with

- **The Concierge plan test** (Michael's stated next step). Expect the concierge journey
  to be where the new model bites: a staff-delivered shortlist still writes contact grants
  directly, so a Concierge mwajiri gets contacts without any accepted EOI. Read the flow
  end to end before changing anything — `src/services/concierge.service.ts`
  (`deliverConciergeShortlist`, the grant write near the shortlist loop),
  `src/payload/collections/concierge-cases/schema.ts`,
  `src/components/dashboard/mwajiri/concierge/concierge-status-card.tsx`, the staff
  concierge pages under `dashboard/staff/concierge/`, and `build-plan.md` Phase 11.
  Confirm with Michael whether concierge should route through the EOI gate or stay a
  staff-run exception, then implement.
- Loop: `pnpm.cmd format` → `lint` → `build`, re-run prettier on the two generated files
  after the build. `/review uncommitted` before he commits.

## Open questions

- **Concierge bypasses the EOI gate** — route it through the EOI flow, or keep the
  staff-delivered shortlist as an explicit exception? He declined a Concierge _reveal_
  button in the blueprint, but the concierge product is a different, staff-run service, so
  it was left intact rather than silently rebuilt.
- **`contact_unlocked` no longer fires anywhere.** Re-add a contact-view event, or rely on
  `interest_responded` (`response: accepted`)?
- **Carried over from the previous session, still unresolved:** the Cloudflare Security
  Events check for the lost M-Pesa callbacks; no customer-facing cue for a payment the
  sweep confirmed as paid; nothing schedules `/api/payload-jobs/run` in production;
  `renewVerification` is still unwired; `dateOfBirth` is identity data yet neither starred
  nor in the completeness list; `displayName` is schema-required while
  `PROFILE_REQUIRED_FIELDS` omits it; whether the "public free-text must reject contact
  details" rule should become a numbered invariant in `architecture.md`; and whether to
  add `DONE` markers to `build-plan.md` Phase 3 and 4.4 headings.
