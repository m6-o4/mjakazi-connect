# Memory — Subscription upgrades (tier rank), one-way upgrades, and the 1–4 tier cap — dev complete, going live

Last updated: 2026-09-24 07:53 UTC

## What was built

Everything below is **uncommitted** at the time of writing (Michael commits after
`/remember save`). It builds on the previous session's committed
concierge/reviews/hire-card work.

**1. Tier rank.** `platform-settings.subscriptionTiers` gained `rank` (optional number,
min 0, unique). `settings.service` resolves every read through `withRanks` into
`RankedSubscriptionTier` — a stored rank, or the tier's position in the stored array for a
row saved before the field existed — computed over the full array before inactive tiers
are filtered. Uniqueness is enforced by the array field's `validate` (the write path both
the settings form and the Payload admin panel share) and again in
`updateSubscriptionTiers` for clean action errors.

**2. Upgrade classification.** `subscription.service.classifyPlanChange` labels a purchase
`upgrade` / `downgrade` / `renewal` / `switch` by rank; the result is recorded as
`planChange` in the `subscription_activated` audit metadata. The carry-over money path is
unchanged (still terms-based per invariant #11).

**3. Fresh concierge case on upgrade.** `createConciergeCaseOnPayment` takes
`{ forceNew }`. An upgrade onto a Concierge tier always creates a fresh case with its own
replacement guarantee; a same-tier Concierge renewal reuses the open one.
`concierge-cases` has no per-mwajiri unique index, so multiple open cases are valid.

**4. One-way rule (upgrades only).** `subscription.service.assertPlanChangeAllowed` is
enforced in `app/actions/subscription.ts` after `beginPurchase` and before
`initiatePayment`. While a subscription is `active`, a lower-ranked tier is refused with
code `downgrade_blocked`. `none` / `expired` / `pending_payment` / `suspended` /
`blacklisted` are not gated.

**5. UI.** The mwajiri purchase page orders tiers by rank, badges the current plan
"Current", disables lower-ranked tiers while active with a "Below your plan" badge, and
reads Upgrade / Switch plan / Extend in the heading, CTA and success copy (with a `switch`
case when the current tier is unresolvable). The admin tiers form gained a Rank input; a
new row is ranked above the highest existing.

**6. Tier cap.** New `src/lib/subscription-tiers.ts` exports `MIN_SUBSCRIPTION_TIERS = 1`
and `MAX_SUBSCRIPTION_TIERS = 4`, used by the schema (`minRows`/`maxRows`), the service
(`too_many_tiers`), and the admin form ("Add tier" disabled at 4 with a helper line).

**7. Docs** updated: `architecture.md`, `build-plan.md`, `progress-tracker.md`,
`ui-registry.md`.

## Decisions made

- **Money semantics unchanged** on an upgrade: the unexpired window converts at the new
  tier's daily rate, a fresh window starts from now, nothing is refunded in cash.
- **Upgrade is defined by an explicit rank field**, not by price.
- **An upgrade onto a Concierge tier always creates a fresh case**; a same-tier renewal
  reuses the open one.
- **Downgrades are blocked only while `active`** — an expired or suspended account may buy
  any tier.
- **The plan list is bounded to 1–4** so the owner cannot overwhelm the mwajiri with
  options.
- **Legacy tiers without a stored rank fall back to their position**; no migration or
  backfill (project was in development).

## Problems solved

- **Rank was `required` with no backfill**, so saving `platform-settings` from the Payload
  panel could fail validation for legacy rows. Fixed by making `rank` optional and
  resolving it on read (and by position); uniqueness moved to the array field's `validate`
  so the panel is covered, not just the custom form.
- **Server `classifyPlanChange` read `rank` raw while the pages fell back to `index`**, so
  legacy rank-less config classified every plan change as `renewal` — no fresh concierge
  case and a wrong audit entry. Fixed by normalising rank once in `settings.service`.
- **The client had no `switch` case**, so a deactivated current tier read as "Extend"
  while the server treated it as a plan change. Added.
- **Guard ordering matters:** `beginPurchase` is a no-op while `active` and moves
  `expired` to `pending_payment`, so the downgrade guard must run AFTER it — that is what
  gates the active path while leaving expired ungated.
- **PowerShell:** always `pnpm.cmd`.
- **A subagent clobbered `purchase-subscription.tsx` and reconstructed it.** Build and
  lint pass and the file was read back complete, but it was not diffed against the
  pre-clobber working copy (which was uncommitted).

## Current state

- All development work is complete. `pnpm build` green; changed files lint clean.
  Repo-wide `pnpm lint` still reports the **9 pre-existing errors under
  `.kilo/worktrees/fortune-trigonometry/design/codebase`** (a separate worktree) —
  unrelated.
- Everything from this session is **uncommitted** at the time of writing.
- The code is being pushed to the **live server with live settings**; the project is
  moving into **updates / bug-patching** mode ("bugs we did not get in development").
- **No automated test framework exists.** Acceptance is Michael's sandbox walkthrough
  (real handset) plus the production run.

## Next session starts with

Production rollout and bug fixes. First confirm the live deploy and settings:
`MPESA_ENVIRONMENT=production` with `MPESA_CALLBACK_URL` pointing at the public production
URL (otherwise payment confirmations never arrive), `NEXT_PUBLIC_SERVER_URL` on the live
domain, Clerk production-instance keys plus `CLERK_WEBHOOK_SIGNING_SECRET`, fresh
`PAYLOAD_SECRET`/`PREVIEW_SECRET`/`CRON_SECRET`, and production DB, S3 bucket, and a
verified Resend sending domain. Then configure the subscription tiers (unique ranks, 1–4)
in Admin → Settings on the live database — a new DB starts empty, and the pricing page has
no plans until they exist.

## Open questions

- Production items not yet confirmed: check Cloudflare Security Events for lost M-Pesa
  callbacks; nothing schedules `/api/payload-jobs/run` in production; no payer cue for a
  sweep-confirmed payment.
- The reconstructed `purchase-subscription.tsx` should be eyeballed before/after the push.
- Carried over: `renewVerification` is unwired; the concierge "who has my contact" view
  and a worker opt-out remain deliberately out of scope; several small data-model
  inconsistencies.
- The mwajiri pricing grid is `md:grid-cols-3`, so four tiers wrap 3+1 — left as-is
  deliberately.
