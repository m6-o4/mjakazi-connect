# Memory — Phase 8.2 availability & hire confirmation complete

Last updated: 2026-09-08 13:34

## What was built

**Phase 8.2 — Availability & hire confirmation, end to end:**
- `src/payload/collections/hires/schema.ts` (new) — sealed collection: `mwajiri → users`,
  `mjakazi → wajakazi-profiles`, `subscription → subscriptions` (snapshotted at confirm),
  `confirmedBy` (`mwajiri | mjakazi`), `confirmedAt`, `agreedAt`, `reversedAt`, `state` =
  `pending_agreement | agreed | reversed`, `sourceEoi`; compound unique index on
  `(mwajiri, mjakazi)` + indexes on `(mwajiri, state)` / `(mjakazi, state)` / `confirmedAt`.
- `src/services/hire.service.ts` (new) — single write path `confirmHireCore` (first confirm
  creates pending + sets availability → `hired`; counterpart re-confirm → `agreed`; a
  `reversed` hire re-opens), plus `confirmHire`, `confirmHireByMjakazi`, `reverseHire`,
  `reverseHiresForMjakazi`, `listHireCandidatesForMwajiri/Mjakazi`, `listHires`.
- `src/lib/email.ts` — 3 templates: `sendHireConfirmedEmail`, `sendHireAgreedEmail`,
  `sendHireReversedEmail`. Audit actions `hire_confirmed` / `hire_agreed` / `hire_reversed`
  added (`lib/audit.ts` + `audit-logs/schema.ts`).
- `src/app/actions/hire.ts` (new) — `confirmHireAction`, `confirmHireByMjakaziAction`,
  `reverseHireAction`.
- UI: `HireConfirmCard` (mwajiri overview), `HireInbox` (mjakazi opportunities),
  `AvailabilityCard` gained the "who hired you" picker (settings).
- `src/lib/payload-helpers.ts` (new) — shared `toId`/`userLabel`/`loadUserName`/
  `loadProfileDisplay`/`loadSenderInfo`, now imported by `eoi`/`contact`/`subscription`/
  `hire` services (dedup); `getSubscriptionByUser` exported from `subscription.service.ts`.
- `src/services/profile.service.ts` — leaving `hired` via the toggle reverses active hires
  (dynamic import avoids a `profile ↔ hire` cycle).
- Docs updated: `architecture.md`, `code-standards.md`, `ui-registry.md`, `progress-tracker.md`.

## Decisions made

- **One hire per (mwajiri, mjakazi)** — compound unique index; explicit `state` enum
  (`pending_agreement | agreed | reversed`) + timestamps (deviation from the architecture's
  literal field list, which had no reversal/state fields).
- **First confirmation sets availability → `hired` immediately** (leaves the directory);
  the other party is emailed and can reverse.
- **Confirmation is gated on a prior relationship** (post-review hardening): `confirmHire`
  requires an active subscription plus an accepted EOI or contact unlock;
  `confirmHireByMjakazi` requires an unlock or sent EOI. No arbitrary counterpart ids.
- **Reversal frees the mjakazi back to `available`** (user-initiated path); the system path
  (toggle leaving `hired`) skips this since availability already changed.
- Mjakazi "who hired you" picker offers unlockers ∪ EOI senders + a "not listed — hired
  elsewhere" fallback (sets hired, records no match).
- **Hire confirmations live on the Opportunities screen** (`HireInbox`), not Settings — the
  developer moved them there; the picker stays in Settings (tied to the availability toggle).
- `sourceConciergeCase` deferred to Phase 11 (the `concierge-cases` collection doesn't exist yet).

## Problems solved

- **Review findings fixed**: (1) authorization gap — confirm entry points accepted arbitrary
  counterpart ids; (2) reversal left `availabilityStatus` stuck `hired`; (3) create path had
  no CAS (concurrent opposite confirmations errored instead of converging — now re-reads and
  recurses on duplicate-key); (4) `getOwnProfile` ran 3× per settings render — now resolved
  once and `profileId` passed in; (5) helper drift — extracted shared helpers; (6) unused
  `export type` removed.
- **Transient build failure**: first `pnpm build` hit a Turbopack Google-Fonts module
  resolution error (`@vercel/turbopack-next/internal/font/google/font`) — unrelated to code,
  a retry compiled clean. (Note: build emits non-fatal Windows `EPERM` symlink warnings for
  sharp/detect-libc.)

## Current state

- **Phase 8.2 complete and manually verified (2026-09-08)** — all 10 scenarios passed:
  confirm from both sides, agree, reverse restores directory visibility, off-platform
  fallback, re-open reversed, authorization gates, idempotency, candidate dedup, and the
  three emails + `hire_*` audit entries. `pnpm lint` 0 errors (3 pre-existing
  `TaskConfig<any>` job warnings); `pnpm build` green.
- **All Phase 8.2 changes are UNCOMMITTED** in the working tree.

## Next session starts with

- **Commit the uncommitted Phase 8.2 changes** (if not already done), then
  **Phase 8.3 — Nudge task**: `jobs/eoi-nudge.ts`, daily, emailing at 7 and 14 days after an
  accepted EOI, two nudges then silence. Re-check `context/build-plan.md` (8.3) and
  `context/progress-tracker.md`.

## Open questions

- Should an unanswered `sent` EOI ever auto-expire, and on what trigger? (likely answered by
  the 8.3 nudge work)
- Carried forward, still unresolved: Phase 5 deferred manual sandbox verification (STK push,
  callback replay idempotency, subscription expiry); pre-expiry verification reminder email
  (12.1); "Extend" button in the subscription status card still uses the outline variant;
  `getContact` returns contact for a `blacklisted` (not deleted) profile (Phase 10.1).
