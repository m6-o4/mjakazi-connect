# Memory — Phase 8.1 expressions of interest complete

Last updated: 2026-09-07 20:04

## What was built

**Phase 8.1 — Expressions of interest (EOI), end to end:**
- `src/payload/collections/expressions-of-interest/schema.ts` — sealed collection:
  `mwajiri → users`, `mjakazi → wajakazi-profiles`, `batchId`, `pendingKey` (unique),
  `state` = `sent | accepted | rejected | expired`, `sentAt`, `respondedAt`; compound
  index on `(mwajiri, mjakazi)`. Registered in `collections/index.ts`.
- `src/services/eoi.service.ts` — `sendEoiBatch` (role + active-subscription gate, 3–5
  batch bound, `DIRECTORY_VISIBLE` recheck, outstanding-interest guard, unique-`pendingKey`
  backstop with rollback), `listSentEois`, `listReceivedEois`, `respondToEoi` (ownership +
  CAS `sent → accepted | rejected`).
- `src/lib/email.ts` — 4 templates: `sendEoiReceivedEmail`, `sendEoiBatchSentEmail`,
  `sendEoiRespondedEmail`, `sendEoiResponseConfirmedEmail`.
- `src/app/actions/eoi.ts` — `sendEoiBatchAction`, `respondToEoiAction`.
- UI: `EoiSend` (saved-page batch selector, `components/dashboard/mwajiri/saved/`),
  `EoiInbox` (`components/dashboard/mjakazi/opportunities/` + `/dashboard/mjakazi/opportunities`
  page), `OpportunitiesCard` (`components/dashboard/mjakazi/opportunities-card.tsx`, overview),
  "Sent interests" card on `dashboard/mwajiri/page.tsx`, "Opportunities" mjakazi nav item.
- Audit action `eoi_responded` added (`eoi_sent` already existed); PostHog `interest_sent` /
  `interest_responded` wired.

## Decisions made

- **EOI is a signal, not a contact reveal.** Acceptance does NOT reveal the mwajiri's phone
  to the mjakazi — the mjakazi sees the sender's name + location only. Contact stays
  one-directional (mwajiri-initiated via unlock).
- **Relationships** = `mwajiri → users`, `mjakazi → wajakazi-profiles` (matches
  `contact-unlocks`, deliberately overriding the drifted architecture relationships diagram).
- **Gate** = active subscription only; no unlock required to send.
- **Re-send policy**: blocked while an EOI is `sent`/`accepted`, allowed again after
  `rejected`. Enforced via a unique `pendingKey` (`<mwajiri>:<mjakazi>`), freed on rejection.
- **`expired` state is declared but nothing writes it** — deferred to 8.3.
- Four EOI emails were pulled forward out of the 12.1 notifications sweep.
- `eoi.service.ts` is now a named **invariant #15 exemption** (reads non-contact display
  fields — `displayName`/`location`, sender name — with an explicit `select`), documented in
  `architecture.md` and `code-standards.md`.

## Problems solved

- **Concurrent duplicate-send race**: the original check-then-create guard had no DB
  backstop. Added the unique `pendingKey` index; a concurrent duplicate create now fails on
  the index, rolls back its own batch records, and returns `already_sent`.
- **Triplicated email helper**: `loadPayerEmail`/`loadWorkerEmail`/`loadUserEmail` were three
  copies of the same trusted-read contract — consolidated into `src/lib/user-email.ts` and
  wired into subscription + verification + eoi services.
- **"Opportunities" link missing after `pnpm build`**: running `next build` overwrites
  `.next` and corrupts a concurrently-running dev server's bundle — symptom is the new nav
  item not appearing. Fix = restart `pnpm dev` + hard refresh. (Note for future sessions:
  do not run `pnpm build` while a dev server is up.)

## Current state

- **Phase 8.1 complete and manually verified** by the developer: batch of 4 sent, one
  accepted + one rejected, both parties' inboxes received the send + response emails, and an
  out-of-range batch is refused. `pnpm lint` 0 errors (3 pre-existing `TaskConfig<any>` job
  warnings); `pnpm build` green.
- Revenue critical path + the full Phase 8.1 EOI loop are done. Next is hire confirmation.

## Next session starts with

- **Phase 8.2 — Availability and hire confirmation**: `hires` collection; either party may
  confirm; a mjakazi setting Hired is asked who hired them (offering waajiri who unlocked or
  expressed interest); confirmation surfaced to the other side + both emailed. The
  availability toggle already exists (built in settings during 6.x). Re-check
  `context/build-plan.md` (Phase 8.2) and `context/progress-tracker.md`.

## Open questions

- Should an unanswered `sent` EOI ever auto-expire, and on what trigger? (likely answered by
  the 8.3 nudge task)
- Carried forward, still unresolved: Phase 5 deferred manual sandbox verification (STK push,
  callback replay idempotency, subscription expiry); pre-expiry verification reminder email
  (12.1); "Extend" button in the subscription status card still uses the outline variant;
  `getContact` returns contact for a `blacklisted` (not deleted) profile (Phase 10.1).
