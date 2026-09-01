# Build Plan

## Purpose

The ordered roadmap for the whole project. Read it before starting any feature to
understand what is next and how it fits. Update it when scope changes.

This is the document you work from day to day. Everything above it —
`project-overview.md`, `architecture.md`, `code-standards.md` — describes the
destination. This one describes the route.

---

## How To Use

- **Before starting a task**: confirm it is the next one, and that everything it
  depends on is genuinely finished rather than nearly finished.
- **One task per session.** Each is sized to be built, reviewed, compiled and
  verified in a single sitting.
- **Never reorder within a phase without saying why.** The order encodes
  dependencies, and several of them are not obvious.
- **After finishing**: write the `progress-tracker.md` entry, register any new
  component in `ui-registry.md`, and tell Michael what to verify.
- **When scope changes**: update this file in the same session, not later.

---

## Build Principles

**Vertical slices, not layers.** A task delivers schema, service, endpoint and UI
for one capability, so that something is genuinely working at the end of it.
Building all the collections, then all the services, then all the UI produces
three days where nothing can be demonstrated and every bug is found at once.

**Domain before presentation, within a slice.** The order inside a task is
schema → service → endpoint → UI. The state machine is the hard part; the screen
is the easy part. A screen built against a service that does not exist yet is
guesswork.

**Money and state machines get built and verified in isolation first.** Payment
is wired to nothing until payment alone is proven correct. This is the one place
where the vertical slice is deliberately broken, because a payment bug that
reaches production costs real money and real trust.

**Mock data is for presentation, never for state.** A dashboard card may render a
hardcoded number while its query is being built. A verification state may never
be faked, not even temporarily — a manual `draft → pending_review` shortcut "for
testing" is exactly how an unpaid profile reaches the directory.

**Nothing is done until Michael has verified it.** Every task ends with a manual
verification script: what to click, what should happen, what would indicate
breakage.

---

## The Critical Path

The revenue spine. Until all of it works, nothing else matters:

```
Identity → Mjakazi profile → Documents → Verification → Verification payment
        → Staff review → Directory → Subscription payment → Contact unlock
```

Phases 0 to 7 are that spine. Phases 8 to 12 are additive: valuable, promised,
but the business does not take money without the spine.

If time runs short, see **Descope Order** at the end.

---

# Phase 0 — Foundation

Everything here is small, and everything downstream breaks without it.

### 0.1 — Role enum migration

**Role**: replaces the template's `admin | editor | user` with this project's
`admin | staff | mwajiri | mjakazi`.
**Why first**: the runbook flags role changes as a lockout risk. Every access
rule, guard and job check reads this. Changing it after code exists means finding
every reference under pressure.
**Builds**: `payload/collections/users/schema.ts`,
`payload/access/access-control.ts`, `payload/strategy/clerk-strategy.ts`,
`app/(payload)/api/webhooks/clerk/route.ts`, jobs access in `payload.config.ts`.
Adds `accountState`, `suspendedAt`, `suspensionReason`.
**Done when**: `pnpm build` passes and no occurrence of `"editor"`, `"user"` as a
role, or `isAuthenticatedOrPublished` remains anywhere.
**Verify**: grep for `editor` and `isAuthenticatedOrPublished`. Sign in as the
bootstrap admin, confirm `/admin` still loads.

**Before running the app**: update `publicMetadata.role` on the bootstrap admin
in the Clerk Dashboard from `admin` — unchanged — and delete any test user whose
metadata says `editor` or `user`.

### 0.2 — Dependencies and environment

**Role**: installs everything the build needs, once.
**Builds**: `posthog-js`, `posthog-node`, `zod`, `react-hook-form`,
`@hookform/resolvers`, `date-fns`. Updates `.env.example`: removes the two
Inngest keys, adds the two PostHog keys, documents MinIO versus R2.
**Done when**: `pnpm build` passes and `.env.example` matches `.env` key for key.
**Verify**: diff the two files.

### 0.3 — Design tokens

**Role**: puts the brand into `globals.css` so every subsequent component is
correct by default rather than corrected later.
**Builds**: `src/globals.css` from `ui-tokens.md`, light and dark. Plus Jakarta
Sans wired via `next/font`.
**Done when**: every token in `ui-tokens.md` resolves; no hardcoded hex anywhere.
**Verify**: homepage renders in brand colours, light and dark.

### 0.4 — Audit logging

**Role**: the operational record. Built now so every subsequent feature writes to
it as it is built, rather than being retrofitted.
**Why now**: this was a late addition in v1 and the gaps show. It is cheap when
it precedes the features and expensive when it follows them.
**Builds**: `audit-logs` collection (immutable: create, update, delete all
false), `lib/audit.ts`.
**Done when**: `writeAuditLog()` works, and a direct `payload.create` into
`audit-logs` is refused.
**Verify**: write one entry from a scratch script, read it in the Payload panel,
try to edit it and fail.

### 0.5 — PostHog

**Role**: analytics from the first feature, not bolted on at the end.
**Builds**: `lib/posthog-client.ts`, `lib/posthog-server.ts` (`flushAt: 1`,
`flushInterval: 0`), provider in the `(saas)` and `(web)` layouts, `identify` on
sign-in and `reset` on sign-out.
**Done when**: a test event appears in PostHog carrying no PII.
**Verify**: fire one event, inspect the payload in PostHog for anything
identifying.

---

# Phase 1 — Identity

### 1.1 — Sign-up with role intent

**Role**: the front door. A stranger declares which side of the marketplace they
are on.
**Builds**: `/registration` role chooser, `(auth)/sign-up/[[...sign-up]]/page.tsx`
reading `?role=`, passing it as `unsafeMetadata`. **No role parameter renders the
chooser** — it never guesses.
**Done when**: both buttons reach Clerk sign-up with the right intent, and a bare
`/sign-up` shows the chooser.
**Verify**: visit `/sign-up` with no parameter, with `?role=mwajiri`, and with
`?role=garbage`. Only the first two proceed; the third shows the chooser.

### 1.2 — Post-auth promotion and dispatch

**Role**: turns declared intent into an authorized role and sends the user to the
right place.
**Why it matters most**: this is the only path by which a self-registering user
acquires a role. If the allowlist leaks, privilege escalation is a URL away.
**Builds**: `(auth)/post-auth/route.ts` — server-side. Reads
`unsafeMetadata.role`, validates against a typed `'mjakazi' | 'mwajiri'`
allowlist, refuses to overwrite an existing `publicMetadata.role`, nulls
`unsafeMetadata`, resolves the Payload user with retry, redirects by role.
**Done when**: all four roles land correctly and no role means the chooser, not a
dead end.
**Verify**: sign up as each role. Then attempt `?role=admin` and confirm the
result is a Mjakazi or Mwajiri, never an admin. Check the Clerk dashboard shows
`publicMetadata.role` set and `unsafeMetadata` empty.

### 1.3 — Domain profiles

**Role**: the 1:1 records everything else hangs off.
**Builds**: `wajakazi-profiles` and `waajiri-profiles` collections per
`architecture.md`, `services/identity.service.ts` with idempotent
`ensureProfile()`, called from `/post-auth`.
**Done when**: registering creates exactly one profile of the right kind, and
registering twice creates no duplicate.
**Verify**: register, check the panel. Sign out, sign in, check no second profile.

### 1.4 — Route guards and dashboard shells

**Role**: the authenticated frame. Four sidebars, correct nav per role.
**Builds**: `(saas)/dashboard/{role}/layout.tsx` with `auth.protect()` plus a
role check; `(payload)/layout.tsx` amended to redirect non-staff to their own
dashboard rather than signing them out; sidebar, topbar, user chip.
**Done when**: each role reaches only its own area.
**Verify**: as a Mjakazi, try `/dashboard/mwajiri`, `/dashboard/admin` and
`/admin`. All three redirect, and **the session survives**.

---

# Phase 2 — Mjakazi Profile and Documents

### 2.1 — Profile form

**Role**: everything a Mwajiri sees when deciding whom to hire.
**Builds**: profile schema fields, `app/actions/profile.ts`, the form at
`/dashboard/mjakazi/profile`, `lib/profile-constants.ts` for categories,
locations, languages, education.
**Done when**: all fields save, reload populated, and completeness is computed.
**Verify**: fill partially, save, reload. Fill fully, confirm completeness
reflects it.

### 2.2 — Document vault

**Role**: the evidence behind the Verified badge, and the most sensitive data
this system holds.
**Builds**: `vault-documents` collection with `signedDownloads`, upload UI,
authenticated streaming route at `api/actions/vault/{id}`, audit entry on every
view.
**Done when**: a document is retrievable only by its owner and staff, and every
retrieval is logged.
**Verify**: upload as a Mjakazi. Copy the URL, open it signed out — it must fail.
Open it as another Mjakazi — it must fail. Open it as staff — it must work and
write an audit entry.

---

# Phase 3 — Verification

### 3.1 — Verification state machine

**Role**: the core trust mechanism. Eight states, explicit transitions.
**Builds**: `services/verification.service.ts` with every transition from
`architecture.md`, each guarded on current state, each writing an audit entry.
**No payment wiring yet.**
**Done when**: every legal transition works and every illegal one is refused.
**Verify**: attempt `draft → verified` directly. It must fail. Attempt
`verified → verified`. It must fail.

**Do not add a temporary shortcut to reach `pending_review` without payment.**
Test the service directly instead. That shortcut is how an unverified profile
reaches production.

### 3.2 — Submit for verification

**Builds**: `/dashboard/mjakazi/verification`, submit action, guards on profile
completeness and both documents present.
**Done when**: an incomplete profile cannot submit, and a complete one moves to
`pending_payment`.
**Verify**: submit with one document missing. Then with both.

### 3.3 — Staff review queue

**Role**: the human judgement the whole product rests on.
**Builds**: `/dashboard/staff/verifications`, oldest first; side-by-side document
viewer; approve and reject with a mandatory reason; attempts increment; 12-month
expiry set on approval. Transactional email to the worker on both approve and
reject (pulled forward from 12.1).
**Done when**: approve makes a profile eligible for the directory, reject records
a reason and increments attempts, and the worker is emailed either way.
**Verify**: approve one, reject another. Confirm expiry is 12 months out, the
emails arrive, and the rejected profile is not publicly visible.

---

# Phase 4 — Payments, Isolated

The one place the vertical slice is deliberately broken. Payment is proven alone
before it is allowed to change anything.

### 4.1 — Payments collection and M-Pesa client

**Builds**: `payments` collection, `lib/mpesa.ts` — OAuth, password and timestamp
generation, phone normalization, STK initiation, environment resolution.
**Done when**: a sandbox STK push reaches a test handset and the record moves to
`stk_sent`.
**Verify**: initiate from a scratch route. Watch the record. Confirm the prompt
arrives. Test normalization against `0712…`, `0112…`, `+254712…`, `712…` and
`2540712…` — all must reach the same stored value, and a nine-digit number
starting with anything other than `7` or `1` must be rejected.

### 4.2 — Callback handling

**Role**: the only thing in the system that may confirm a payment.
**Builds**: `api/webhooks/payments/callback/route.ts`. Verifies amount, phone,
merchant and transaction-ID uniqueness. Stores the raw payload. Confirms or
fails. **Triggers no domain transition yet.**
**Done when**: a successful payment confirms, a declined one fails, and a
replayed callback is ignored and logged.
**Verify**: pay in sandbox. Then replay the same callback by hand — the second
must be refused and audit-logged.

### 4.3 — Payment timeout task

**Builds**: `jobs/payment-timeout.ts`, registered on Payload's queue, moving
`stk_sent` to `expired` after the window.
**Done when**: an ignored prompt expires on its own.
**Verify**: initiate, ignore the prompt, wait, confirm the state changes.

### 4.4 — Verification payment: initiate + wire to review

**Role**: the first monetized transition, end to end.
**Builds**: a minimal admin-only `platform-settings` global holding
`verificationFee` (pulled forward from 10.3); the verification payment
initiation (pay button + Server Action calling `initiatePayment` with
`paymentType = verification`, amount from `platform-settings`, phone from the
profile — pulled forward out of 5.2); and the confirmed-callback wiring — on
`payment.confirmed` with `paymentType = verification`, atomically move
`pending_payment → pending_review`, store the payment reference, lock documents,
write the audit entry.
**Done when**: a complete profile can pay end to end and lands in
`pending_review` only on a confirmed callback; a failed payment leaves the state
untouched; documents are locked during review.
**Verify**: pay the KSh 1,500 fee end to end. Then confirm a failed payment
leaves the state untouched, and replay the callback by hand — nothing applies
twice.

---

# Phase 5 — Subscriptions

### 5.1 — Subscriptions collection and state machine

**Builds**: `subscriptions` collection, `services/subscription.service.ts`, six
states, stacking logic that appends to existing expiry rather than to `now()`.
Tier prices and durations read live from `platform-settings.subscriptionTiers`,
never hardcoded. `payments.tier` (currently `'1'|'2'|'3'`) is replaced by
`tierId` + `tierName` string snapshots in the same pass.
**Done when**: every transition is guarded and stacking is correct.
**Verify**: with an active window, purchase again. Confirm the new expiry is old
expiry plus duration, not today plus duration.

### 5.2 — Purchase flow

**Builds**: `/dashboard/mwajiri/subscription`, which renders the tier list
(names + prices) live from `platform-settings.subscriptionTiers` — never
hardcoded, so an admin price change is what a mwajiri sees at sign-up — plus tier
selection, payment initiation, status polling, wiring `payment.confirmed` to
activation.
**Done when**: paying activates access within seconds of the handset
confirmation.
**Verify**: buy Essentials in sandbox. Confirm state, tier and expiry.

### 5.3 — Subscription expiry task

**Builds**: `jobs/subscription-expiry.ts`, hourly.
**Done when**: an expired subscription blocks new reveals while leaving existing
unlocks intact.
**Verify**: set an expiry in the past, run the task, confirm both halves.

---

# Phase 6 — Directory and Contact Vault

### 6.1 — Public directory

**Role**: the shop window, and the one place the marketing half touches domain
state.
**Builds**: `/directory` and `/directory/[slug]`, filters by category, location
and experience, newest verified first, using `isDirectoryVisibleOrOwner` and an
explicit `select` that omits contact fields.
**Done when**: only verified and available profiles appear, and no contact data
exists anywhere in the response.
**Verify**: **view source and search the raw HTML and the RSC payload for a known
phone number.** Not the rendered page — the payload. Nothing may be found.

### 6.2 — Latest Verified Profiles block

**Builds**: homepage block, most recently verified, reading the same guarded
path.
**Done when**: it updates as profiles are verified.
**Verify**: verify a profile, reload the homepage.

### 6.3 — Mwajiri browse

**Builds**: `/dashboard/mwajiri/browse` and `browse/[id]`, same data, with unlock
affordances for subscribers.
**Done when**: masked without a subscription, unlockable with one.
**Verify**: browse with no subscription. Every contact masked.

### 6.4 — Contact unlock

**Role**: the transaction the entire business exists to enable.
**Builds**: `contact-unlocks` collection unique on (mwajiri, mjakazi),
`services/contact.service.ts` as the **only** place contact fields are read,
`api/actions/contact/reveal`. Atomic: unlock record plus audit entry plus return.
**Done when**: reveal works only with an active subscription and unlocks are
permanent.
**Verify**: reveal with an active subscription. Expire it. Confirm the previous
unlock is still visible and a new reveal is refused with a 403. **Then check the
raw response of an unpaid profile view for the phone number.**

---

# Phase 7 — Verification Expiry

### 7.1 — Expiry task

**Builds**: `jobs/verification-expiry.ts`, daily. `verified →
verification_expired` past expiry, profile hidden, worker emailed.
**Done when**: expiry happens without anyone remembering.
**Verify**: backdate an expiry, run the task, confirm the profile leaves the
directory.

**The critical path ends here. The business can take money.**

---

# Phase 8 — Expressions of Interest and Hires

### 8.1 — Expressions of interest

**Builds**: `expressions-of-interest` collection, batch send of 3–5 by a
subscribed Mwajiri, `/dashboard/mjakazi/opportunities` to accept or reject,
emails both ways.
**Done when**: a batch outside 3–5 is refused and both parties are notified.
**Verify**: send a batch of four. Accept one, reject one. Check both inboxes.

### 8.2 — Availability and hire confirmation

**Role**: makes Match Conversion Rate measurable, and starts the replacement
clock.
**Builds**: availability toggle; `hires` collection; either party may confirm; a
Mjakazi setting Hired is asked who hired them, offering waajiri who unlocked or
expressed interest; confirmation surfaced to the other side; both emailed.
**Done when**: confirmation from either side produces the same recorded hire.
**Verify**: confirm from the Mwajiri side. Then, with another pair, from the
Mjakazi side.

### 8.3 — Nudge task

**Builds**: `jobs/eoi-nudge.ts`, daily, at 7 and 14 days after an accepted
expression of interest. Two nudges, then silence.
**Verify**: backdate an acceptance, run the task, confirm one email and no
repeats.

---

# Phase 9 — Reviews

### 9.1 — Reviews

**Builds**: `reviews` collection, submission gated on an existing unlock, one per
unlock, staff moderation queue at `/dashboard/staff/reviews`, published reviews
on the profile.
**Done when**: a review cannot be left without an unlock, nor twice, and nothing
appears before moderation.
**Verify**: attempt a review without an unlock. Submit one, confirm it is
invisible, publish it, confirm it appears.

---

# Phase 10 — Admin and Moderation

### 10.1 — Moderation

**Builds**: suspend, reinstate, delete, blacklist per the authority matrix in
`project-overview.md`. Staff suspend only. Mandatory reason. Audit entry on every
action.
**Done when**: staff can suspend and cannot reinstate.
**Verify**: as staff, suspend an account, then try to reinstate. The second must
fail.

### 10.2 — Admin dashboard

**Builds**: `/dashboard/admin` with account counts, verification throughput and a
running payment total split by verification fees and subscriptions.
**Verify**: compare the total against the `payments` collection by hand.

### 10.3 — Staff management and platform settings

**Builds**: `/dashboard/admin/staff`, a `platform-settings` global (`admin`
only) holding the verification fee plus the `subscriptionTiers` array
(`tierId`, `name`, `price`, `durationDays`, `description`, `isActive`,
`isConcierge`), and `/dashboard/admin/settings` where the admin edits both.
Admin edits tiers through a form that PUT-replaces the whole array, validating
required fields and unique `tierId` (the v1 pattern). Tiers can be removed or
deactivated with `isActive`; `tierId` is snapshotted onto subscriptions/payments
at purchase and must not change after go-live.
**Done when**: changing a tier price in settings changes what is charged with no
deploy, and the mwajiri pricing page reads the tier list at runtime.
**Verify**: change a tier price, initiate a purchase, confirm the STK amount;
add a new tier and confirm it appears on the pricing page.

### 10.4 — Audit log viewer

**Builds**: `/dashboard/staff/audit-logs`, filterable by action, actor and date.
**Verify**: filter to document views and confirm every entry names a viewer.

---

# Phase 11 — Concierge

### 11.1 — Cases and intake

**Builds**: `concierge-cases`, auto-created on a confirmed concierge
(`isConcierge`) tier payment, requirements brief at `/dashboard/mwajiri/concierge`.
**Verify**: buy Concierge in sandbox, confirm a case appears in `intake`.

### 11.2 — Staff queue and shortlist

**Builds**: `/dashboard/staff/concierge`, claim a case, build a 3–5 shortlist from
verified profiles with a note per candidate, deliver.
**Done when**: delivery writes ordinary `contact-unlocks` for shortlisted
candidates.
**Verify**: deliver a shortlist. Confirm the Mwajiri sees it and those contacts
are unlocked.

### 11.3 — Outcome and replacement

**Builds**: outcome recording, one-time replacement within 30 days of a confirmed
hire, reopening the same case.
**Verify**: confirm a hire, request a replacement, confirm the case reopens.
Request a second — it must be refused.

---

# Phase 12 — Launch

### 12.1 — Notifications sweep

Every email in one pass: expiry warning and expiry, payment receipt, expression
of interest sent and answered, hire confirmed, shortlist delivered, suspension.
(Verification approved/rejected emails were pulled forward to Phase 3.3.)
**Verify**: trigger each once. Check copy, links and sender.

### 12.2 — PostHog sweep

Every event in the `code-standards.md` list fires with correct properties and no
PII.
**Verify**: run a full user journey, read the PostHog event stream.

### 12.3 — Security pass

- No payment bypass, mock route, or dev shortcut anywhere.
- No `overrideAccess: true` outside the three named exemptions.
- No contact field in any public response.
- No document URL in HTML, RSC payload, log or analytics event.
- `.env` not committed. No `NEXT_PUBLIC_` secret.
- Grep for `console.log` carrying anything identifying.

### 12.4 — Production cutover

Real Daraja credentials and a live test with one shilling. Storage switched to
R2. Clerk production keys. Webhook endpoints re-registered on the production
domain. Sitemaps. Legal pages reviewed. Stale "job postings" copy removed from
the footer.

---

## Descope Order

If the date is at risk, cut from the bottom. Nothing here is on the critical
path.

1. **Concierge (Phase 11)** — largest, least built. Change the pricing card to
   "By request — contact us" and handle cases by email until it ships.
2. **Reviews (Phase 9)** — the trust loop is valuable but the directory works
   without it.
3. **Nudge task (8.3)** — hire confirmation still works, it just under-reports.
4. **Admin dashboard totals (10.2)** — the numbers are in the panel already.
5. **Latest Verified Profiles block (6.2)** — the directory is the real surface.

**Never cut**: audit logging, the contact vault protection in 6.4, callback
idempotency in 4.2, or the security pass in 12.3. Those are what make this a
high-trust product rather than a directory with a payment form.

---

## Progress

Track completion in `progress-tracker.md`, not here. This file says what is
planned; that one records what actually happened.
