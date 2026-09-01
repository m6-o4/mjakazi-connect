# Memory — Phase 3.2 Submit for Verification

Last updated: 2026-09-01

## What was built

- **`app/actions/verification.ts`** (new) — `submitForVerificationAction` Server
  Action: authenticate → require `mjakazi` → delegate to `submitForVerification`
  → revalidate `/dashboard/mjakazi` + `/dashboard/mjakazi/verification`.
- **`app/(saas)/dashboard/mjakazi/verification/page.tsx`** (new) — state-aware
  page across all eight verification states. `draft` renders the submit flow;
  every other state renders a status card.
- **`components/dashboard/mjakazi/verification/submit-verification.tsx`** (new) —
  client component: readiness checklist (profile complete + both documents) with
  links to fix, submit button disabled until ready, fires `verification_submitted`
  PostHog event on success then `router.refresh()`.
- **`components/dashboard/mjakazi/verification/verification-state.tsx`** (new) —
  presentational status copy for the 7 non-draft states (pending_payment,
  pending_review, verified, rejected, verification_expired, blacklisted,
  deactivated), no action buttons yet.
- **`lib/dashboard-nav.ts`** — added "Verification" mjakazi nav item.
- **`verification-status-card/index.tsx`** — "ready" state now links to the
  verification page.

## Decisions made

- Submit is a **Server Action**, not a route handler (per "prefer a Server
  Action").
- The verification page is **state-aware from the start**; only `draft →
  pending_payment` is wired now.
- `pending_payment` is an **honest status card** — no price, no disabled pay
  button (payment lands Phase 4.4; the fee is in `platform-settings`, Phase
  10.3 — never hardcoded, invariant #12).
- **No confirmation dialog** before submit — no fee is taken in this phase.
- Resubmit (`resubmitForVerification`) and renew (`renewVerification`) are
  deliberately **not wired** — `rejected`/`verification_expired` are unreachable
  until Phases 3.3 / 7.1.

## Problems solved

- `pnpm`/`pnpm.cmd` scripts fail under PowerShell execution policy — use
  `pnpm.cmd lint` / `pnpm.cmd build` / `pnpm.cmd exec prettier ...`.
- `prettier --write` on `context/*.md` rewraps the whole files (large unrelated
  diff). Reverted and re-applied the markdown edits by hand; format only source
  files with prettier, never the context docs.

## Current state

- Phase 3.2 **complete and verified by Michael**. `pnpm lint` (0 errors, 1
  pre-existing `pages/schema.ts` warning) and `pnpm build` pass. Route
  `/dashboard/mjakazi/verification` present.
- Deferred (unchanged): staff/admin document *view* still lands in Phase 3.3.

## Next session starts with

Phase 3.3 — Staff review queue. Run `/architect` first. Build
`/dashboard/staff/verifications` (oldest first), side-by-side document viewer
(audited per view), and wire the existing `approveVerification` /
`rejectVerification` service functions (mandatory reject reason, attempts
increment, 12-month expiry on approve). Rejected profiles must stay out of the
directory.

## Open questions

- `verified → pending_review` identity-change trigger (Phase later) still
  unresolved.
- "Fresh Certificate" renewal enforcement still unresolved.
- Free-resubmit boundary `FREE_REJECTIONS = 3` (`<= 3` free / `> 3` paid)
  confirmation still open.
- `blacklisted → deactivated` is currently illegal (terminal) — Phase 10.1 may
  need it.
