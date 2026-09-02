# Discovery Questions

Everything I need answered to write `project-overview.md`, `architecture.md`,
`code-standards.md`, `library-docs.md` and `build-plan.md` to a standard where an LLM can
build Mjakazi Connect from them without asking follow-up questions.

Answer inline under each question, or reply in chat by number (`1.4: ...`). Where I have
proposed a default, "agreed" is a sufficient answer.

**Sources I have read:** the five stub docs, the three finished UI docs, `root/AGENTS.md`,
the JobPilot exemplar set, `01. Mjakazi Connect Product Overview & Positioning.md`, the
seven files in `/interface`, all 22 screenshots, and the live site at
https://www.mjakaziconnect.co.ke.

---

## 0. Blockers

**0.1 — Vault access. CLOSED 2026-08-08.** Resolved by
`payload-cms-clerk-auth-integration-runbook.md` (vault Knowledgebase, rewritten 2026-07-28
against a completed 27–28 July build).

Settled by the runbook, no longer open:

- Payload 3.x, Next.js 16 (App Router), `@clerk/nextjs` 7.x, MongoDB.
- Clerk owns identity, sessions and credentials. Payload owns the user record and is the
  management surface.
- Inbound: a custom Payload `AuthStrategy` verifies the Clerk session per request and
  provisions a Payload user inline if none exists. A webhook at `/api/webhooks/clerk`
  handles `user.created|updated|deleted`.
- Outbound: collection hooks on `users` create/update/delete the Clerk identity when an
  admin acts in the Payload panel.
- Loop guard: a `fromClerkWebhook` request-context flag distinguishes inbound from
  admin-originated writes.
- Authorization: a single `role` per user. Collection-level access governs the API and
  admin UI; field-level access locks `role` so a user cannot self-promote.
- Route protection is resource-based (`auth.protect()` in the relevant layout), not
  centralized route matching. `createRouteMatcher` is deprecated.
- `src/proxy.ts`, not `middleware.ts` (renamed in Next.js 16, now Node runtime).
- Multiple root layouts: no `src/app/layout.tsx`. Each route group renders its own
  `html`/`body`, because Payload's `RootLayout` renders them itself.
- `globals.css` is imported per route group, never hoisted, or Tailwind preflight fights
  the Payload admin stylesheet.
- Layout: `src/payload.config.ts`, Payload code under `src/payload/`, route groups
  `(payload)`, `(web)`, `(auth)`. Files kebab-case, exports PascalCase.
- Reusable access module at `src/payload/access/access-control.ts`, including an
  `isAdminOrOwner(ownerField)` factory for ownership-scoped collections.

The runbook's Known Pitfalls section is inherited wholesale into `library-docs.md`. Open
items it creates for this project are in §7.

**0.2 — Repository target.** Is this rebuild:

- (a) a fresh repo scaffolded from the standardized Payload template, with the live app
  decommissioned at cutover, or
- (b) an in-place refactor of the existing Mjakazi Connect codebase?

This changes `build-plan.md` fundamentally. Screenshots suggest the live app is still on
test data (7 accounts, KSh 4 revenue), which points to (a) with no data migration.
Confirm.

**0.3 — Is the existing codebase available to me?** If yes, where? Reading it would let me
capture what already works rather than re-deriving it.

---

## 1. Product truth — feeds `project-overview.md`

### 1.1 Tier naming and numbering

Three different naming schemes are in play:

| Source                     | Names                                                            |
| -------------------------- | ---------------------------------------------------------------- |
| Product overview doc       | Level 1 (Essential), Level 2 (Standard), **Level 4** (Concierge) |
| Same doc, §6 Fair-Exchange | refers to "**Level 3**" for the replacement guarantee            |
| Live site                  | Essentials Plan, Standard Plan, Concierge Plan                   |
| Screenshots                | "Essentials Plan"                                                |

The Level 3 / Level 4 mismatch is a genuine error in the product doc. Which set of names
is canonical in code and copy? **Proposed:** drop level numbers entirely, use `essentials`
/ `standard` / `concierge` as the enum values and "Essentials Plan / Standard Plan /
Concierge Plan" in copy. Agreed?

### 1.2 Service categories

The product doc references "five service categories" but never lists them. The browse
screenshot shows: Nanny/Childcare, Housekeeping, Chef/Cook, Driver, Tutor/Homework Help.
Is that the canonical five? Are they fixed in code or editable by admins in Payload?
**Proposed:** a Payload `categories` collection so admins can add a sixth without a
deploy.

### 1.3 The Mjakazi funnel

- Is the KSh 1,500 fee required to appear in the directory at all, or does an unpaid
  "Pre-verified" profile still show publicly with a different badge?
- If pre-verified profiles are visible, can a Mwajiri unlock their contacts too, or is
  unlocking gated to Verified profiles only?
- What are the exact profile states? **Proposed:** `draft` → `submitted` → `under_review`
  → `verified` → `expired` → `rejected` / `suspended`.
- What happens at the 12-month expiry? Profile hidden, or shown as "Verification expired"?
  Is there a grace period, and a reminder cadence?

### 1.4 The Mwajiri funnel and the Contact Vault

- The live homepage says "No payment is required to browse profiles." Confirm:
  `/directory` is fully public, showing profile cards with contact details masked, and
  payment unlocks contact + documents.
- Does an active plan unlock **all** profiles for the window, or is there a cap on
  unlocks? The pricing copy says "Direct Contact Reveal" with no number.
  **Recommendation:** if it is unlimited, say so explicitly in the docs — an LLM will
  otherwise invent a credit system.
- What exactly does "Verified Reference Visibility" (Standard tier) unlock that Essentials
  does not? Same for "Profile Bookmarking".
- No auto-renewal, no refunds. Can a Mwajiri buy a second plan while one is active —
  stack, extend, or block?
- What happens to previously unlocked contacts after the window expires? Do they stay
  visible in a history view, or lock again? **Recommendation:** keep them visible
  permanently. Re-locking something already delivered contradicts the "access constitutes
  delivery" policy and will generate support load.

### 1.5 Expressions of Interest

The Mjakazi `Opportunities` screen shows a Mwajiri expressing interest and the Mjakazi
responding Interested / Not Interested. This is not in the product doc.

- Does expressing interest require an active plan?
- Does it happen before or after a contact unlock?
- What does the Mjakazi see about the Mwajiri — the screenshot shows full name and email
  address, which is a notable privacy asymmetry given "Wajakazi only see your job
  requirements, not your personal data" on the homepage. Is the screenshot the intended
  behaviour or a bug in the previous build?
- What does "Not Interested" do — hide the Mwajiri, notify them, nothing?

### 1.6 Job postings — contradiction

The live footer says "Apply to verified job postings and connect directly with waajiri."
There is no job-postings feature in any screenshot, and the product doc describes a
directory model, not a jobs-board model. Is job posting:

- (a) real and planned but unbuilt,
- (b) stale copy to be removed, or
- (c) the same thing as Expressions of Interest, described loosely?

### 1.7 Ratings and reviews

The product doc's "Trust Loop" describes post-hire ratings and reviews. Nothing in the
mockups implements it. In scope for this rebuild, or a later phase? If in scope: who can
review whom, is it moderated pre-publish, and can a Mjakazi respond?

### 1.8 Concierge tier operations

Concierge is "managed matching" — admins shortlist and vet on the Mwajiri's behalf,
delivered through the dashboard. Nothing in the admin screenshots supports this. What does
it actually need?

- An intake form for the Mwajiri's requirements?
- An admin queue for concierge cases with status tracking?
- A "Match Report" artifact delivered to the Mwajiri dashboard — what is in it, and is it
  a document, a page, or both?
- The 30-day replacement guarantee — does it need workflow support (a claim button, an
  admin review) or is it handled off-platform?

**Recommendation:** Concierge is the single largest hidden scope item here. It is ~4 admin
screens and a workflow engine's worth of work behind one pricing card. Consider building
it as a Phase 6 and shipping the two self-led tiers first, with the Concierge card marked
"By request — contact us" until then.

### 1.9 Verification mechanics

The product doc says "3rd party check of National ID and Certificate of Good Conduct." The
admin screenshots show a manual `Pending Verifications` review queue. Which is it? If
there is a real third party, name them and I will document the integration; if it is
manual admin review with a target of <48 hours, I will document that and drop "3rd party"
from the copy.

### 1.10 Accounts, staff and roles

The SA dashboard shows Accounts, Audit Logs, Staff Management, Settings. Confirm the role
set. **Proposed:** `mjakazi`, `mwajiri`, `staff`, `super_admin`. What can `staff` do that
`super_admin` can, and what is reserved? What is the audit log's write policy — every
mutation, or a named list of sensitive actions?

### 1.11 Content and marketing surface

Confirm the public route map. From the live site and `/interface`:

```
/                          Homepage (hero, why, how it works, pricing, testimonials, blog teaser, CTA)
/directory                 Public directory, contacts masked
/directory/[slug]          Public profile detail          ← confirm this exists
/posts                     Blog index
/posts/[slug]              Blog post
/registration              Role-select then Clerk sign-up
/sign-in                   Clerk sign-in                  ← live site uses /sign-ins (typo?)
/terms-of-service
/privacy-policy
/mjakazi/*                 Mjakazi dashboard: dashboard, profile, documents, verification, opportunities, settings
/mwajiri/*                 Mwajiri dashboard: dashboard, browse, subscription, settings
/admin-console/*           Staff/SA: dashboard, pending-verifications, accounts, audit-logs, staff-management, settings
/admin                     Payload admin panel
```

- Is `/sign-ins` on the live site intentional or a typo to fix?
- What is the dashboard URL prefix? The previous build's paths are not visible in the
  screenshots. **Proposed:** `/mjakazi`, `/mwajiri`, `/admin-console`, keeping `/admin`
  free for Payload.
- Are testimonials CMS-managed or hardcoded?
- Blog: categories, authors, related posts, search, RSS? Which of these exist?
- Any other static pages — About, Contact, FAQ, Refund Policy?

### 1.12 Language and locale

- English only, or Kiswahili too? Given the Mjakazi audience this is a real product
  question, and retrofitting i18n is expensive. **Recommendation:** if Kiswahili is ever
  likely, decide now and structure copy accordingly, even if only English strings ship in
  v1.
- Currency KSh, timezone Africa/Nairobi, date format — confirm.
- Phone number format and validation: `+254` E.164 canonical?

### 1.13 Success criteria

The North Star is Match Conversion Rate, but the platform has no "hire happened" event.
How is a successful match recorded? Without that, MCR is unmeasurable. **Recommendation:**
add a lightweight "Did you hire?" confirmation prompt to the Mwajiri dashboard near window
expiry, and a `hired` availability state on the Mjakazi side (already present in the
Opportunities screenshot). Cheap, and it makes the North Star real.

Also list the other things that must be true for this rebuild to be called done,
JobPilot-style — I will put them in a Success Criteria section.

### 1.14 Explicit out of scope

I will write this list, but tell me if any of these are wrong. **Proposed out of scope:**
in-app messaging/chat, transport or relocation logistics, contracts or payroll, mobile
apps, auto-renewing subscriptions, cash refunds, escrow or salary payments, multi-country,
agency/multi-user Mwajiri accounts.

---

## 2. Technical shape — feeds `architecture.md`

### 2.1 Stack confirmation

Confirm or correct, with versions where you have a preference:

| Layer           | Proposed                                    |
| --------------- | ------------------------------------------- |
| Framework       | Next.js (App Router) — which major version? |
| CMS / backend   | Payload 3.x, MongoDB adapter                |
| Database        | MongoDB — self-hosted on Contabo, or Atlas? |
| Auth            | Clerk                                       |
| UI              | Tailwind + Shadcn/UI + lucide-react         |
| Payments        | M-Pesa STK Push — **via which provider?**   |
| Object storage  | ? (see 2.3)                                 |
| Email           | Resend                                      |
| SMS / WhatsApp  | ? (see 2.5)                                 |
| Background jobs | Inngest, or Payload jobs queue?             |
| Analytics       | PostHog                                     |
| Error tracking  | Sentry, or nothing?                         |
| Hosting         | Contabo VPS + Docker + Traefik, or Vercel?  |

### 2.2 M-Pesa

This is the highest-risk integration in the build and needs to be specified in detail, not
left to an LLM.

- Direct Safaricom Daraja, or an aggregator (Intasend, Paystack, Flutterwave, Kopokopo)?
  Paybill/Till number already provisioned?
- Is there existing working M-Pesa code in the current build I should preserve?
- Callback URL handling: the callback is the source of truth, not the STK response.
  Confirm the flow I plan to document:
  `initiate → pending payment record → STK push → user PIN → C2B callback → verify → grant access → notify`.
- Timeout and failure handling: what does the UI do if no callback arrives in 60s? Is
  there a status-query poll fallback?
- Reconciliation: does an admin need a manual "mark as paid" escape hatch for payments
  that succeeded on M-Pesa but failed to record? **Recommendation:** yes, with an
  audit-log entry. This will happen.
- Is PayPal (in your standard stack) used here at all, or M-Pesa only?

### 2.3 Document storage and NDPA

National IDs and Certificates of Good Conduct are sensitive personal data and you are the
Data Controller. This deserves precision.

- Storage target: MinIO on your VPS, or Cloudflare R2? Kenyan data-residency
  considerations either way?
- Encryption at rest — provider-level, or application-level envelope encryption before
  upload?
- Access: signed URLs with short TTL, or streamed through an authenticated Next route so
  no URL ever leaks? **Recommendation:** the latter for ID documents; signed URLs are fine
  for profile photos.
- Who can view an ID document — verifying staff only, super admin, both? Is viewing itself
  an audit-logged event? **Recommendation:** yes.
- Retention: how long after account deletion or verification expiry are documents
  destroyed? Is there an automated purge?
- Do Waajiri ever see the raw documents, or only the verification badge and extracted
  fields? The pricing copy says "Credential Verification" and the homepage says documents
  are unlocked. Clarify exactly what a paying Mwajiri sees.
- Consent capture at registration — is the checkbox on the Clerk sign-up enough, or do you
  need a versioned, timestamped consent record?

**Recommendation:** I want to split this out into a dedicated
`context/security-privacy.md` rather than burying it in `architecture.md`. It is a legal
obligation, it has its own invariants, and an agent should be able to read it in isolation
before touching anything document-related.

### 2.4 Access control model

How is "this Mwajiri may see this Mjakazi's phone number" enforced? **Proposed:** Payload
field-level `access.read` on the contact fields, checking for an active `accessGrant` for
the requesting user, so the rule holds regardless of whether the read comes from a page,
the local API, or the REST API. Confirm, or describe the template's approach.

### 2.5 Notifications

The pricing page promises "Email, Phone and WhatsApp Support" on the Standard and
Concierge tiers.

- Is WhatsApp a support channel (a human on a phone) or a product integration?
- Transactional email via Resend — confirm.
- SMS for OTP, payment confirmation, or verification-status updates? Kenyan SMS needs a
  local provider (Africa's Talking is the usual). Required in v1?
- Full notification matrix: which events notify whom, on which channel? I will draft this
  if you confirm the channels.

### 2.6 Rendering and data flow

- Directory: static with ISR, or dynamic per request? Filters are a query-param surface,
  which argues dynamic; SEO argues static. **Proposed:** public directory and profile
  pages statically generated with on-demand revalidation when a profile changes; filtered
  views dynamic.
- Marketing and blog pages: ISR from Payload with revalidate-on-publish hooks.
- Mutations: Server Actions, or Next route handlers? **Proposed:** Server Actions for
  UI-triggered mutations, route handlers reserved for webhooks (Clerk, M-Pesa) and
  anything a third party calls.
- Does the template already dictate this? Deferring to it if so.

### 2.7 Data model

I will write the full collection schema, but need these decisions:

- One `users` collection with a role field, or separate `mjakazi-profiles` and
  `mwajiri-profiles` collections related to a thin `users`? **Proposed:** the latter — the
  two profiles share almost no fields, and it keeps access control legible.
- Money: stored as integer cents/shillings, never floats. Confirm KSh has no sub-unit
  handling needed.
- Soft delete vs hard delete, given NDPA right to erasure.
- Are audit logs in Mongo, or shipped elsewhere? Retention period?

Proposed collections — tell me what is missing or wrong:

```
users              mjakazi-profiles     mwajiri-profiles
categories         languages            locations
documents          verifications        access-grants
payments           expressions-of-interest
reviews            audit-logs
posts              post-categories      authors
media              testimonials
globals: site-settings, pricing, legal-pages
```

### 2.8 Invariants

The JobPilot `architecture.md` ends with a hard "never violate" list, and it is the single
most valuable section for keeping an LLM on the rails. Mine will include, unless you
object:

- Never auto-renew a subscription. No recurring billing primitives, ever.
- Never issue a cash refund path in code.
- The M-Pesa callback is the only thing that grants access. Never grant on the STK
  response.
- Never return a Mjakazi's contact fields without an active access grant.
- Never log, cache, or include a document URL or ID number in an error message, analytics
  event, or client-side payload.
- Every read of an identity document writes an audit-log entry.
- All money is integer KSh.
- All datetimes stored UTC, rendered Africa/Nairobi.

---

## 3. Conventions — feeds `code-standards.md`

### 3.1 Testing

The JobPilot standards say "every feature must be testable" but define no test tooling.
Your development philosophy says you compile and test each task before proceeding. What
does that mean concretely?

- (a) Manual verification in the browser only,
- (b) Vitest for units plus manual UI checks, or
- (c) Vitest + Playwright E2E on critical paths (registration, payment, verification,
  unlock)?

**Recommendation:** (c), but Playwright limited to four flows. Payment and access-control
regressions are the ones that cost real money and real trust, and they are exactly what an
LLM breaks silently on a later task.

### 3.2 Validation, errors, logging

- Zod for all boundary validation — confirm.
- Structured return shape for Server Actions and route handlers: reusing JobPilot's
  `{ success, data?, error? }`, or something else?
- Sentry, or console + PostHog only?
- User-facing error copy: English only, tone?

### 3.3 Naming and structure

JobPilot's conventions are reasonable and I will inherit them unless you differ:
kebab-case folders, PascalCase components, named exports only, one component per file,
`@/` alias, props typed above the component, no barrel files outside `components/ui`. Any
house rules of yours that differ?

### 3.4 Git and CI

- Branch strategy, commit message convention (Conventional Commits?)
- What does CI run on PR — typecheck, lint, tests, build?
- Does an LLM agent commit directly, or only produce diffs for you to place? Your
  philosophy says you place code into the IDE yourself. Should `code-standards.md` state
  that agents never run `git commit`?

### 3.5 PostHog event taxonomy

JobPilot's fixed-event-list section is a good pattern. Draft list — add, remove, rename:

```
registration_started            { role }
registration_completed          { role, userId }
mjakazi_documents_uploaded      { userId }
mjakazi_verification_submitted  { userId }
mjakazi_verified                { userId, daysToVerify }
directory_searched              { filters, resultCount }
profile_viewed                  { profileId, isUnlocked }
plan_selected                   { plan, amount }
payment_initiated               { plan, amount, method }
payment_completed               { plan, amount }
payment_failed                  { plan, reason }
contact_unlocked                { profileId }
interest_expressed              { profileId }
interest_responded              { profileId, response }
hire_confirmed                  { profileId }
```

Any event carrying an ID number, phone number, or document URL is forbidden.

### 3.6 Environment variables

I will produce the full table. Confirm you want a committed `.env.example` and that
secrets live in Docker/Portainer env at deploy time.

---

## 4. Libraries — feeds `library-docs.md`

### 4.1 Which libraries already have skills?

`AGENTS.md` lists `/shadcn`, `/payload`, and the `/clerk` family. Are those skills
installed and current in the rebuild repo? Anything else?

### 4.2 Which need entries?

Libraries with no skill get a `library-docs.md` entry with version, purpose, gotchas and
project rules. My candidate list — tell me which you actually intend to use:

M-Pesa SDK or hand-rolled Daraja client · Inngest · Resend · PostHog (js + node) · Zod ·
react-hook-form · date-fns or Day.js · MinIO/S3 client · Sharp · Africa's Talking · Sentry
· recharts (admin charts?) · @tailwindcss/typography (already registered in `globals.css`)

### 4.3 The Next.js deprecation rule

`AGENTS.md` says to read `node_modules/next/dist/docs/` before using any Next API. Is that
directory actually present in the version you are using, or is that rule inherited from
the JobPilot template and needs rewording?

### 4.4 Version pinning

Do you want exact pinned versions in `library-docs.md`, or ranges? **Recommendation:**
exact, recorded at scaffold time. Version drift between sessions is a common source of an
agent writing plausible code against the wrong API.

---

## 5. Sequencing — feeds `build-plan.md`

### 5.1 Task granularity

Your philosophy is one task at a time, reviewed and compiled before the next. Should each
numbered feature be sized to roughly one agent session, and should each carry an explicit
**Definition of Done** with a manual verification script ("log in as a Mwajiri, pay KSh
5,000 with test credentials, confirm the contact reveals and an audit entry is written")?

**Recommendation:** yes. The JobPilot build plan degrades noticeably after feature 12 —
the format breaks, and feature 14 references "Cover Letters Generated" which is explicitly
out of scope in its own overview doc. A rigid per-feature schema is what prevents that.

### 5.2 UI-first principle

JobPilot builds every page's full UI with mock data before wiring logic. You already have
HTML mockups in `/interface`. Adopt the same principle — build the page from the mockup
with mock data, verify visually, then wire? Confirm.

### 5.3 Phase order

Proposed sequence. Reorder as you see fit:

```
Phase 0  Scaffold, tokens, globals.css, layout shell, Clerk wiring, Payload config
Phase 1  Marketing site — homepage, legal pages, blog (CMS-driven)
Phase 2  Registration and role routing
Phase 3  Mjakazi — profile, documents, verification submission
Phase 4  Admin console — verification queue, accounts, audit logs, staff
Phase 5  Public directory — browse, filter, profile detail, masked contacts
Phase 6  Payments — M-Pesa, access grants, contact unlock
Phase 7  Expressions of interest and availability states
Phase 8  Mwajiri dashboard — subscription, activity
Phase 9  Reviews and trust loop            (if in scope, per 1.7)
Phase 10 Concierge tier                    (if in scope, per 1.8)
Phase 11 Analytics, notifications, hardening, launch checklist
```

Note that Phase 4 lands before Phase 5 deliberately: nothing can appear in the directory
until something can verify it.

### 5.4 Launch gate

What must be true before this replaces the live site? DNS cutover plan, legal page
sign-off, NDPA registration status, seed content, real M-Pesa credentials tested with a
live shilling?

---

## 6. Recommendations, unprompted

**6.1 Add three documents to the context set.** Nine files is not too many if each has one
job, and the alternative is `architecture.md` growing to 2,000 lines that no agent reads
carefully.

- `context/domain-glossary.md` — Mjakazi/Wajakazi, Mwajiri/Waajiri, singular and plural,
  capitalization, and the fact that "Mjakazis" is wrong. An LLM will get this wrong in UI
  copy on roughly every third generation without a lookup table.
- `context/security-privacy.md` — NDPA obligations as binding rules, per 2.3.
- `context/decisions.md` — a dated ADR log. When a later session asks "why MongoDB and not
  Postgres", the answer is a file, not a re-litigation. This is the single highest-value
  addition for your stated goal of a reusable method.

**6.2 The product doc has errors worth fixing at source.** Level 3 vs Level 4 (§6), "five
service categories" never enumerated (§2), "3rd party check" vs the manual admin queue (§2
vs the screenshots), and MCR defined against an event the platform never records (§4). If
that document is going to be an input to future LLM sessions, correct it rather than
working around it downstream.

**6.3 Make `AGENTS.md` state what to do when docs conflict.** Right now it gives a read
order but no precedence rule. Proposed: design assets in `/interface` beat `ui-*.md`;
`architecture.md` beats `build-plan.md`; anything contradicting `security-privacy.md`
stops work and asks. Without a precedence rule, an agent picks whichever file it read most
recently.

**6.4 Record the "why" per feature, not just the "what".** Your philosophy asks for name,
role in the system, and rationale before implementation. JobPilot's build plan captures
name and what, but not why. Adding a one-line rationale per feature is cheap and is
exactly the thing that survives into the reusable template.

**6.5 Consider a `context/mock-data.md`.** If every phase builds UI-first with mock data,
an agreed set of fixture Wajakazi, Waajiri, categories and payments means every session
mocks the same shapes, and the fixtures become your test seed data later. Currently each
session would invent its own.

**6.6 The concierge tier is a trap.** Repeating 1.8 because it matters: one pricing card
is hiding an operations product. Either scope it properly now or gate it behind "contact
us" for launch.

---

## 7. Runbook-derived decisions — feeds `architecture.md` and `code-standards.md`

The template runbook is a two-role CMS pattern (`admin` / `editor` / `user`). Mjakazi
Connect is a three-sided marketplace with two public dashboards. Six things the runbook
settles for a content site do not survive that jump. Each is a decision to make once,
before scaffold, because the runbook flags several of them as lockout risks.

### 7.1 The role enum — CLOSED 2026-08-08

**Decision: flat four-value enum.** `admin | staff | mwajiri | mjakazi`. `user` is
retired. The template's enum is forked; its access _mechanism_ is not.

| Mjakazi Connect   | Payload `role` | v1/v2 docs called this |
| ----------------- | -------------- | ---------------------- |
| Super Admin       | `admin`        | `sa`                   |
| Back-office staff | `staff`        | `admin`                |
| Employer          | `mwajiri`      | `mwajiri`              |
| Worker            | `mjakazi`      | `mjakazi`              |

No one holds more than one role. Staff do both verification review and marketing content,
so `staff` keeps Payload panel access: `access.admin` is `isAdminOrStaff`.

Option (c) from 7.1d was taken. `editor` is retired because `isAdminOrEditor` guarding a
national-ID approval endpoint reads wrong; `isAdminOrStaff` does not.

Staff keep Payload panel access — marketing content is edited in Payload, not in the staff
console. `access.admin` therefore stays `isAdminOrStaff`.

Rationale: one field, one equality test. `hasRole(user, 'mjakazi')` says what it means; a
`role`+`accountType` pair is a two-field predicate someone will eventually get half-right
in an access rule. The `accountType` discriminator proposed in 7.1a is therefore
**withdrawn** — unnecessary under a flat enum.

Cost, on the record: the registration path now writes `role` directly, so the typed
allowlist in 7.2 is the only thing standing between a query parameter and privilege
escalation. Under the withdrawn two-field design a total allowlist failure could only
produce a wrong `accountType`, never `admin`. That defense-in-depth property is gone and
must be replaced by an explicit, tested control.

#### 7.1d BLOCKING — the `admin` name collision

All thirteen inherited documents use `mjakazi | mwajiri | admin | sa`, where **`admin`
means back-office staff** and `sa` means super admin. The new enum uses **`admin` to mean
super admin**. The same token denotes opposite privilege levels in the two vocabularies.

Every state machine says things like "Only `admin` or `sa` can move Pending Review →
Verified" and "Admin Roles: `admin`, `sa`". An agent reading an unamended inherited doc
against the new enum will grant back-office staff super-admin authority, or deny super
admins operations they own. This is a silent, plausible-looking failure — the worst kind.

Three ways out:

- **(a) Adopt `admin | editor | mwajiri | mjakazi` and rewrite every role reference in the
  inherited docs as they are absorbed.** Nothing enters `context/` carrying the old
  vocabulary. Requires a disciplined pass over ~13 documents.
- **(b) Keep `sa | admin | mwajiri | mjakazi`** to match the inherited corpus verbatim.
  Zero rewriting, but forks further from the runbook and `sa` is opaque to a newcomer.
- **(c) Adopt `admin | staff | mwajiri | mjakazi`.** Same rewrite cost as (a), but `staff`
  reads correctly at every call site. `isAdminOrEditor` guarding a national-ID approval
  endpoint is semantically wrong; `isAdminOrStaff` is not.

**RESOLVED: (c).** `admin | staff | mwajiri | mjakazi`.

The mapping table above goes in `domain-glossary.md`, and every inherited document has its
role references rewritten before it enters `context/`. Nothing carrying `sa` or the old
meaning of `admin` is absorbed unamended.

#### 7.1e Where does role authority live? — CLOSED: Payload authoritative

Confirmed. Payload `role` is authoritative; Clerk `publicMetadata.role` is a mirror used
only as a client-side rendering hint and never as an authorization. `AD §6.1` is amended
on absorption.

<details><summary>Original analysis</summary>

The inherited docs and the runbook disagree.

- `AD §6.1`: "Role authority is stored in Clerk `publicMetadata.role`."
- `AB §10`: forbids "using Clerk metadata as sole enforcement mechanism."
- Runbook: Payload `users.role` is authoritative; `syncClerkUser` mirrors it out to Clerk;
  the auth strategy reads the Payload record on every request.

**DECIDED: Payload is authoritative, Clerk mirrors.** This matches the runbook, matches
`AB §10`, and means every server-side check reads one place. Clerk `publicMetadata.role`
exists only for cheap client-side rendering hints and is never an authorization. `AD §6.1`
is amended on absorption.

</details>

#### 7.1a Consequence — the account-type discriminator

Mwajiri and Mjakazi share the `user` role, so `role` alone cannot tell them apart, and
they need different dashboards, different profile collections and different access rules.
A second field is required.

**Decision (confirm): `accountType` on the `users` collection.**

- Values: `mwajiri | mjakazi`, null for `admin` and `editor`.
- Locked with the same field-level access pattern as `role`
  (`access: { create: isAdminField, update: isAdminField }`) — otherwise a Mwajiri could
  flip themselves to Mjakazi and appear in the directory without ever being verified.
- Mirrored into Clerk `publicMetadata` alongside `role` by the existing `syncClerkUser`
  hook, with `accountTypeChanged` added to the change check.
- Rejected alternative: deriving type from which profile document exists. It costs a query
  on every check and has a race window during registration where neither profile exists
  yet.

Changing someone's `accountType` after the fact is admin-only. Open question: should it be
possible at all, or should a Mwajiri who wants to list as a Mjakazi register separately?
**Recommendation:** admin-only, logged, and rare — but not forbidden, because it will be
asked for.

#### 7.1b Consequence — self-registration never writes `role`

This materially simplifies §7.2. Because both public account types map to `user`, which is
already the schema default, the self-serve registration path never needs to write `role`
at all. It only promotes `accountType`.

**Invariant:** no client-originated code path can set or influence `role`. Ever. `role` is
written only by an `admin` in the Payload panel or by the bootstrap metadata. This removes
privilege escalation from the registration surface entirely rather than mitigating it.

#### 7.1c Consequence — staff must not get blanket read on `users`

Runbook pitfall, deliberately chosen:

> **Editors should not get blanket read on users.** Granting `isAdminOrSelf` a `true`
> branch for editors hands them every user record.

But Mjakazi Connect staff _are_ editors, and they must review Wajakazi documents to verify
them. The temptation is to add an editor branch to `isAdminOrSelf`.

**Decision: do not.** `users` stays locked to `isAdminOrSelf`. Everything staff need to do
their job lives on the domain collections — `mjakazi-profiles`, `documents`,
`verifications` — where editors get explicit read and update access. The verification
queue reads profiles, not accounts.

This keeps the runbook's rule intact and has the better security property: staff can
verify a Mjakazi without being able to enumerate every Mwajiri's email address.

### 7.9 New — custom admin console, or the Payload panel?

Surfaced by 7.1c. The previous build has a bespoke `/admin-console` with six screens:
Dashboard, Pending Verifications, Accounts, Audit Logs, Staff Management, Settings.

Payload's own admin panel already provides Accounts, Audit Logs, Staff Management and
Settings, for free, with search, filtering, pagination and access control already wired.
Four of the six screens are being rebuilt from scratch to look on-brand.

Three options:

- **(a) Payload panel only.** Staff work in `/admin`. The verification queue is a custom
  view mounted inside the panel. Roughly four screens of work disappear. Cost: staff see
  Payload's UI, not the Mjakazi brand.
- **(b) Custom console only.** As the previous build. Full brand control, four screens
  rebuilt, and every future collection needs a hand-built admin screen.
- **(c) Split.** Payload panel for CRUD-shaped work (accounts, staff, settings, blog).
  Custom console for the two things that are genuinely workflow, not CRUD: the
  verification review queue and the operations dashboard.

**Recommendation: (c).** Verification review is a real workflow — side-by-side document
viewing, approve/reject with reasons, SLA tracking against the <48-hour target — and
Payload's panel is a poor fit for it. Everything else is CRUD and Payload does CRUD better
than we will.

This is a §1-scope question as much as a technical one, so it also needs an answer before
`build-plan.md` can be sequenced.

### 7.2 Role assignment at registration — the load-bearing gap

The runbook has no self-registration path. Every user is either the bootstrap admin
(metadata set by hand in the Clerk Dashboard) or created from the Payload panel by an
admin. Mjakazi Connect's primary flow is a stranger choosing "I am a Mjakazi" or "I am a
Mwajiri" and signing themselves up.

The strategy reads `clerkUser.publicMetadata.role`, defaulting to `user`. Nothing in a
self-serve Clerk sign-up writes `publicMetadata` — it is server-writable only. The
available lever is `unsafeMetadata`, which Clerk accepts at `signUp.create()` and on the
`<SignUp />` component.

**`unsafeMetadata` is client-writable and therefore untrusted.** A user can set
`{ role: "super_admin" }` from the browser console. It must be treated as a declaration of
intent, never as an authorization.

Proposed flow:

```
/registration            role chooser, writes intent to unsafeMetadata
  ↓
Clerk <SignUp unsafeMetadata={{ intendedRole }} />
  ↓
/post-auth               server component; reads unsafeMetadata,
                         validates against the self-selectable allowlist
                         (mjakazi | mwajiri only), promotes to publicMetadata
                         via the Backend API, clears unsafeMetadata,
                         then redirects by role
```

Confirm this, or say how the template intends to handle it. Two follow-ons:

- Clerk's static redirect env vars (`NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`,
  currently `/admin`) cannot route by role. `/post-auth` becomes the single redirect
  target for both sign-in and sign-up, and it dispatches. Agreed?
- A user who abandons between Clerk sign-up and `/post-auth` exists in Clerk with no role.
  What happens on their next sign-in — does `/post-auth` re-run and re-prompt?
  **Recommendation:** yes, make `/post-auth` idempotent and have it re-prompt for role
  when none is set. This will happen often on mobile.

**Invariant for the docs:** `unsafeMetadata` is never read as an authorization. Only
`publicMetadata.role`, written server-side, grants anything.

### 7.3 The admin panel guard must change

Runbook `src/app/(payload)/layout.tsx` redirects any non-`admin`/`editor` to `/sign-out`.
The runbook itself flags this as provisional:

> Revisit this once a SaaS group exists: forcing a logout is right when a `user`-role
> account has nowhere to go, and hostile once they have a dashboard.

Mjakazi Connect has dashboards, so it is now hostile. A signed-in Mjakazi who mistypes
`/admin` should land on `/mjakazi`, not be logged out.

**Proposed:** the `(payload)` layout redirects non-staff to `/post-auth`, which dispatches
them to the right dashboard. Same helper, one place. Agreed?

This is the first thing this project teaches the template back.

### 7.4 Route group and dashboard layout

Runbook has three root layouts: `(payload)`, `(web)`, `(auth)`. Mjakazi Connect adds three
authenticated dashboards with a shared sidebar shell.

- One `(app)` group with a shared root layout and role-guarded sub-layouts
  (`(app)/mjakazi`, `(app)/mwajiri`, `(app)/console`), or
- three separate root groups?

**Recommendation:** one `(app)` group. The sidebar shell, header, and user menu are
identical across all three in the screenshots; only the nav items differ. One root layout,
one `ClerkProvider`, one `globals.css` import, and a per-area `layout.tsx` that calls
`auth.protect()` then checks the Payload role.

Confirm the URL prefixes while we are here — §1.11 proposes `/mjakazi`, `/mwajiri`,
`/admin-console`, leaving `/admin` to Payload.

### 7.5 `overrideAccess: true` — the contact vault's biggest risk

Runbook pitfall:

> **Local API calls bypass access control.** `payload.create()` and `payload.find()`
> default to `overrideAccess: true`.

The entire commercial model rests on a phone number not being readable without a paid
access grant. Field-level access will not save us: every server component that calls
`payload.find()` without passing `req` and `overrideAccess: false` silently returns the
contact fields, and they then ship to the browser inside the RSC payload whether or not
anything renders them.

**Proposed invariants:**

- Every Local API read that can touch a Mjakazi profile passes `overrideAccess: false` and
  the authenticated `req`. The only exemptions are the Clerk strategy and the Clerk
  webhook, which are named explicitly.
- Contact fields are never selected by default. Directory and profile queries use an
  explicit `select`, and the contact fields are fetched by a single dedicated function
  that checks the access grant first.
- A Playwright test asserts that an unauthenticated and an unpaid request to a profile
  page contain no phone number anywhere in the response body, including the RSC payload.
  (This is §3.1's argument for E2E in one concrete sentence.)

Agreed? Anything to add?

### 7.6 Immutable email

Runbook: email is set once at creation and locked, because Clerk's `updateUser` cannot
change a primary email.

For a CMS with a handful of staff that is fine. For a public marketplace where Wajakazi
self-register on mobile keypads, a mistyped address is permanent and support-visible.
Options:

- (a) keep it immutable, handle corrections by deleting and re-registering,
- (b) build the full Clerk change-email flow (create address object, mark primary, verify,
  delete old) behind a settings screen,
- (c) immutable for now, with an admin-only correction path.

**Recommendation: (c) for v1, (b) if support volume justifies it.** Note that (a) is worse
than it sounds — deleting a Payload user deletes their Clerk account and would orphan
uploaded documents and any payment history.

### 7.7 Password field on self-registered users

Runbook's `validatePassword` exempts creates that carry a `clerkId`, which is what makes
strategy-provisioned users work. Self-registered Wajakazi and Waajiri all arrive with a
`clerkId`, so they pass. Admin-created staff still require a password. That is correct
as-is — recording it so nobody "fixes" it later.

### 7.8 What we owe the template

Per your goal of feeding learnings back: 7.2 (self-registration and role promotion), 7.3
(non-staff redirect), 7.4 (dashboard route groups) and 7.5 (`overrideAccess` discipline)
are all gaps the runbook does not cover because it was written for a content site. Each
should end up as a runbook amendment once proven here. I will keep a running list.

#### 7.1f Surfaces — CLOSED 2026-08-08

Three surfaces, two of which we build:

| Surface             | Path     | Status                                                          | Owner roles      |
| ------------------- | -------- | --------------------------------------------------------------- | ---------------- |
| Payload admin panel | `/admin` | **Exists.** Shipped by Payload. We sign in, we do not build it. | `admin`, `staff` |
| Admin dashboard     | TBD      | To build                                                        | `admin`          |
| Staff dashboard     | TBD      | To build                                                        | `staff`          |

All collections — marketing _and_ domain — live in Payload. Marketing content (Pages,
Posts, Categories, Calls to Action, Header, Footer, Branding, Media, Redirects) is edited
in the Payload panel, not in the staff dashboard. The current live panel already has
exactly this shape.

Wajakazi and Waajiri never reach any of the three.

Still open: what sits on the admin dashboard that is not on the staff dashboard. Candidate
split — `admin` gets pricing/tier configuration, role assignment, blacklist authority,
super-admin overrides and platform revenue; `staff` gets the verification queue,
moderation actions and concierge cases. Confirm.

#### 7.1g BLOCKING — staff in the Payload panel bypasses the audit trail

Direct consequence of 7.1f, and it breaks a stated invariant.

Domain collections live in Payload. Staff have Payload panel access for marketing.
Payload's panel therefore lets a staff member open
`/admin/collections/wajakazi-profiles/<id>` and view the National ID and Certificate of
Good Conduct uploads directly.

`03 §3.5` and `AD §17` both require every document view to write an audit log entry
(`document_view`). Payload's generic admin UI writes nothing. The audit trail has a hole
exactly where NDPA exposure is highest, and it is invisible — the logs look complete
because the reads that skip them never appear.

Compounding it: the live panel has a single `Media` collection. If identity documents are
uploaded into the same collection as marketing images, they share one bucket and one
access policy. Marketing media must be publicly readable. Identity documents must never
be.

**Proposed, needs confirmation:**

- A separate `documents` collection, distinct from `media`, on a private bucket with no
  public URL and `read` access denied to everyone at the collection level
  (`isRestricted`).
- Document vault fields carry `admin: { hidden: true }` so they never render in the
  Payload panel at all.
- Documents are viewable only through a streamed, authenticated route consumed by the
  staff dashboard, which writes the `document_view` audit entry before returning bytes.
- `media` keeps its public read for marketing assets and never accepts an identity
  document.

This is the concrete reason verification review must live in the custom staff dashboard
rather than being handed to Payload's panel — it is not a branding preference, it is the
only place the audit obligation can be met.

#### 7.1h Inherited document status — CLOSED 2026-08-08

The v2 set (04–10, AB) and AD are **authoritative**, amendable where fresh circumstances
warrant. 01–03 are superseded where they conflict; specifically `03 §4.1`'s pro-rated
payment utility is dead — `05 §5` and `07 §4` mandate pure stacking with no pro-rating.

Amendments already agreed: role vocabulary (7.1d), role authority (7.1e).

---

## 8. What the v1 codebase actually does — read 2026-08-08

Source: `/codebase` (288 source files, near-complete v1 implementation). This supersedes
inference from screenshots. Where v1 and the inherited design documents disagree, the code
is what ran.

### 8.1 CRITICAL — v1 has two disconnected identity systems

The runbook's central premise is that Clerk authenticates _into Payload_ via a custom
`AuthStrategy`, so `req.user` is always a Clerk-backed user carrying a role, and
collection access control is real enforcement.

**v1 does not do this.** There is no Clerk auth strategy anywhere in `src/payload/`.
Instead:

|             | `users`                                      | `accounts`                          |
| ----------- | -------------------------------------------- | ----------------------------------- |
| Purpose     | Payload admin panel login                    | Clerk identity mirror               |
| Auth        | `auth: true` — native Payload local strategy | none                                |
| Has `role`? | **No**                                       | Yes (`mjakazi\|mwajiri\|admin\|sa`) |
| Used by     | `/admin`                                     | the SaaS app                        |

Consequences, all verified in the code:

1. **The Payload admin panel is guarded by nothing.** `src/app/(payload)/layout.tsx` is
   the unmodified Payload-generated file — no `auth.protect()`, no role check. Entry is
   controlled solely by `users.access.admin`, which is `isAuthenticated`. Clerk is
   irrelevant to `/admin`.
2. **`users` is wide open to anyone who gets in.** `create`, `read`, `update`, `delete`
   are all `isAuthenticated`. Any Payload user can mint another Payload user.
3. **The access-control module is inert for SaaS data.** Every helper (`isAdminOrSA`,
   `isSA`, `isAdminOrAccountOwner`, `isAdminOrProfileOwner`, `isAdminOrVaultOwner`) reads
   `user.role`. In the Payload panel `req.user` is a `users` document, which has no `role`
   field, so `isAdminOrSA` is permanently false and `isAdminOrAccountOwner` resolves to
   `{ clerkId: { equals: undefined } }` — a filter matching nothing.
4. **All real enforcement lives in the API route layer.** Routes call
   `resolveIdentity(payload, clerkId)` and then use the Local API, which defaults to
   `overrideAccess: true`. This matches `AB`'s four-layer contract, but it means the data
   layer has no independent say. One route that forgets the check leaks contact details,
   and no second line of defence exists.
5. **Two credential sets.** Staff need a Payload password _and_ a Clerk account, with no
   link between them.

Every helper in `access-control.ts` also casts `user as any` — precisely the pitfall the
runbook documents ("`AccessArgs<User>` types the document, not the user... leads to
casting `user as any` throughout"). The runbook post-dates v1 and fixes this.

**Proposed decision for the rebuild: adopt the runbook model.** One `users` collection
with `disableLocalStrategy` and the Clerk strategy; `accounts` is merged into it; profiles
relate to `users`. The Payload panel is entered with a Clerk session and guarded by the
runbook's `(payload)/layout.tsx` pattern. Collection and field access become genuine
enforcement, with the API layer as the _second_ line rather than the only one.

This is defence in depth for the one thing the business model rests on: a phone number not
being readable without a paid grant.

### 8.2 What v1 got right and must be preserved

Not everything needs rebuilding. These are good and should carry forward:

- **`/apis/auth/assign-role`** — `VALID_PUBLIC_ROLES = ["mjakazi","mwajiri"]`, promotes
  `unsafeMetadata` to `publicMetadata`, refuses to overwrite an existing role, and
  explicitly nulls the unsafe value so it cannot be replayed. This is exactly the control
  §7.2 proposed, already written.
- **`syncClerkUser`'s escalation guard** — a privileged role in `unsafeMetadata` without a
  matching `publicMetadata` value is treated as an attack, logged, and rejected. Keep
  verbatim.
- **`/post-auth` route** — role-based dispatch with `retry()` around identity resolution
  to absorb webhook eventual-consistency. The retry is the detail that matters; without it
  first-login races.
- **`ensureDomainProfile`** — idempotent, swallows duplicate-key errors from concurrent
  webhook deliveries.
- **`cleanupOrphanedProfile`** — deletes the stale profile when a role changes.
- **Inngest jobs already exist** for verification expiry, subscription expiry,
  subscription timeout and payment timeout.
- **Audit logging** via `lib/audit.ts`, wired into identity sync.

### 8.3 v1 surface inventory

Route groups: `(auth)`, `(payload)`, `(saas)`, `(web)`, `(sitemaps)` — the `(saas)` group
answers §7.4. Dashboards live at `/dashboard/{mjakazi,mwajiri,admin,sa}`, so admin and
staff already have separate dashboards as described.

Payload collections built: `accounts`, `users`, `wajakazi-profiles`, `waajiri-profiles`,
`subscriptions`, `payments`, `expressions-of-interest`, `vault`, `audit-logs`,
`categories`, `media`, `pages`, `posts`, `calls-to-action`.

API routes built: verification submit/approve/reject/uploads, payments
initiate/callback/mock, subscriptions initiate, contact vault access, EOI send/respond,
admin create-staff/delete-staff/delete-user/update-profile/vault-file, SA
platform-settings/subscription-tiers, profile updates, Clerk webhook, Inngest.

### 8.4 Housekeeping

`codebase/.env` is present in the shared folder and is not the `.env.example`. If it holds
live Clerk secrets, M-Pesa credentials or the Mongo URI, rotate them or remove the file
before this folder is shared further or committed.

---

## 8. Findings from the v1 codebase (`/codebase`, v1.27.0)

Read 2026-08-08. Next.js 16.2.4, Payload 3.84.1, Clerk 7.3.1, MongoDB, Inngest, Resend, S3
client + presigner (MinIO), Microsoft Clarity, semantic-release. Route groups already
`(web)`, `(auth)`, `(saas)`, `(payload)`, `(sitemaps)`, with domain logic in
`src/services` — matching `AD §5` exactly.

### 8.1 The two-auth-system defect, precisely

This is the stated reason for the rebuild, and the code shows exactly what it is.

- `collections/users` — `auth: true` (native Payload local strategy, password). This is
  what the Payload admin panel authenticates against.
- `collections/accounts` — the Clerk mirror, carrying `clerkId` and the `role` enum
  (`mjakazi | mwajiri | admin | sa`).

Two identity records per human, with no link between them. Two consequences:

**(a) `users` access control is wide open.** Every gate on the collection is
`isAuthenticated`:

```
access: { admin: isAuthenticated, create: isAuthenticated,
          delete: isAuthenticated, read: isAuthenticated,
          update: isAuthenticated }
```

Any authenticated user can read, create, update and delete every user record. There is no
role check anywhere on the collection.

**(b) The role-based access helpers may never fire.** `req.user` resolves to a `users`
document, which has no `role` field — hence the `(user as any)?.role` casts throughout
`access-control.ts`. If `req.user` is a `users` doc then `user.role` is `undefined`, so
`isAdminOrSA` returns `false` unconditionally and `isAdminOrAccountOwner` filters on
`clerkId: undefined`. Stated as a hypothesis to verify against a running instance, not as
a confirmed claim — but the `as any` casts are the symptom the runbook predicts, and it
predicts them precisely.

The runbook's design removes both: one `users` collection with
`disableLocalStrategy: true`, the Clerk strategy attached, `role` on that same record, and
`req.user` typed from `payload-types`. `accounts` disappears; the identity mirror _is_
`users`.

### 8.2 §7.2 is already solved in v1 — and solved well

The registration flow I proposed already exists, and the security control is correct.
`apis/auth/assign-role/route.ts`:

- Rejects unauthenticated callers.
- `VALID_PUBLIC_ROLES = ["mjakazi", "mwajiri"]` — arbitrary role injection is blocked at
  the boundary.
- Refuses to overwrite an existing `publicMetadata.role` (idempotent).
- Explicitly nulls `unsafeMetadata.role` after promotion, with a comment noting that an
  empty object would leave the key intact.

`post-auth/route.ts` resolves identity with a `retry()` wrapper for webhook eventual
consistency, then dispatches by role. This is inherited essentially intact — the allowlist
pattern is the control §7.1 said had to exist, and it already does.

Three defects to fix on the way through:

- **Silent default to `mjakazi`.** `sign-up/[[...sign-up]]/page.tsx` does
  `roleParam === "mwajiri" ? "mwajiri" : "mjakazi"`. Anyone reaching `/sign-up` without a
  query param becomes a Mjakazi. A Mwajiri arriving from a stale link, a bookmark, or
  Clerk's own "create account" link on the sign-in page is silently misfiled, and the role
  is then locked by `assign-role`'s no-overwrite rule. **Fix:** no param renders the
  chooser. Never guess.
- **Promotion runs client-side and can be abandoned.** `/authenticating` is a client
  component that `fetch`es `assign-role` from a `useEffect`. Close the tab mid-flight and
  the user has a Clerk session with no role; `resolveIdentity` then fails and `/post-auth`
  bounces them to `/` forever, with no recovery path. **Fix:** do the promotion
  server-side inside `/post-auth`, reading `unsafeMetadata.role` directly. This deletes
  `/authenticating`, the `sessionStorage` dance, and the client fetch.
- **`sessionStorage` as a second channel.** Present because `unsafeMetadata` was evidently
  not surviving Clerk's internal redirects reliably. Verify whether it still does under
  Clerk 7.3+; if it does, drop `sessionStorage` entirely. If it does not, the server-side
  read in `/post-auth` needs a fallback and the chooser must re-prompt.

### 8.3 Inherited without change

- Route-group layout and `src/services` domain layer.
- `isAdminOrOwner`-style ownership factories, once retyped off `payload-types`.
- The `retry()` wrapper around identity resolution — webhook lag is real.
- S3/MinIO presigned-URL access for the vault.

### 8.4 Open

Michael has additional experience improvements to add once the current-state review is
complete. Captured here so they are not lost: **pending, to be gathered after §1.**

### 8.5 What the codebase already settles (no need to ask)

- **Stack, exact versions.** Next 16.2.4, Payload 3.84.1, Clerk 7.3.1, React 19.2.5,
  Tailwind 4.2.4, Inngest 4.3.0, Resend 6.12.2, date-fns, react-hook-form, lucide-react,
  motion, radix. Pins lifted straight into `library-docs.md`.
- **M-Pesa Daraja is genuinely implemented**, not stubbed. `lib/mpesa.ts` has OAuth,
  password/timestamp generation, sandbox/production host resolution, phone normalisation
  to `2547…`, and STK push. Env keys `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`,
  `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL`, `MPESA_ENVIRONMENT` are live
  in `.env` but **absent from `.env.example`** — fix on the way through.
- **Inngest jobs exist**: `payment-timeout`, `subscription-timeout`,
  `subscription-expiry`, `verification-expiry`. Matches `AD §15`.
- **Verification state machine is implemented as specified** — all eight states present on
  `wajakazi-profiles`, plus attempts, expiry, rejection reason, blacklist/deactivate
  timestamps, reviewer notes.
- **The real Mjakazi profile is far richer than any doc describes**: nationality, marital
  status, religion, education level, languages, work preference, salary range,
  available-from, jobs/skills. Options come from shared constants.
- **Conventions are recoverable from config**: prettier with
  `@ianvs/prettier-plugin-sort-imports`, eslint flat config, semantic-release (so
  Conventional Commits), pnpm, tabs, named exports, kebab-case dirs.
- **Route map is known** — 70 routes enumerated, `(web)`, `(auth)`, `(saas)`, `(payload)`,
  `(sitemaps)`, `apis/*`.

### 8.6 Risks the codebase surfaces

- **`ENABLE_PAYMENT_BYPASS` and `apis/payments/mock`.** A bypass route in a system where
  payment confirmation is the sole gate on all monetized state. Must be deleted outright
  or compiled out of production builds, not merely env-gated. Contradicts `AB §10` and
  `06 §6` ("never trust frontend", "only the callback may confirm").
- **No test framework at all.** `package.json` has no vitest, jest, or playwright. §3.1 is
  therefore a greenfield decision, not a migration.
- **Two storage backends configured simultaneously** — Cloudflare R2 _and_ MinIO. Only one
  can own the document vault.
- **Microsoft Clarity, not PostHog.** §3.5's event taxonomy assumed PostHog.
- **`.env.example` has drifted** from `.env` — M-Pesa and `ENABLE_PAYMENT_BYPASS` missing.

### 8.7 The eight remaining product decisions

Everything else is now derivable. These are not:

1. Concierge / Tier 3 — specified in docs, zero code. In v1 scope or deferred?
2. Reviews — specified in `08 §10`, zero code. In scope?
3. Expressions of Interest — exists in code, absent from the v2 spec. Keep, and how does
   it relate to contact unlock?
4. "Apply to verified job postings" in the live footer — real feature or stale copy?
5. Canonical job/skill categories — docs say Housekeeping, Nanny, Chef, Gardener, Driver,
   Caregiver; screenshots show Tutor/Homework Help. Which list?
6. Locations — code and docs enumerate a handful of Nairobi/Mombasa/Kiambu options;
   positioning says nationwide. Fixed enum or open?
7. Analytics — Clarity, PostHog, or both?
8. Document vault storage — MinIO or R2?

### 8.8 Decisions — 2026-08-08

1. **Concierge / Tier 3** — not implemented in v1. Rebuild scope call outstanding (see
   8.9).
2. **Reviews** — clarification pending.
3. **Expressions of Interest — IN SCOPE, completed this time.** Flow: a Mwajiri with an
   active subscription expresses interest in a Mjakazi; the Mjakazi receives it and
   accepts or rejects. Existed in v1 code as a late addition, never finished.
4. **Job postings — OUT OF SCOPE.** Stale marketing copy from before the workflow settled.
   Remove from the footer. May return later.
5. **Categories — two distinct concepts, not one list.**
   - _Primary category_ (the six): Housekeeping, Nanny/Childcare, Chef/Cook, Gardener,
     Driver, Caregiver (Elderly).
   - _Additional skills_ (open-ended, e.g. Tutor / Homework Help) which a Mjakazi adds to
     strengthen their profile. The v1 schema's multi-select "Jobs / Skills" field
     conflates these. Split them.
6. **Locations — fixed enum**, extended programmatically during maintenance windows. Not
   free text, not user-extensible.
7. **Analytics — PostHog only.** Microsoft Clarity is removed entirely:
   `@microsoft/clarity` dependency, `components/clarity-tracker`, and
   `NEXT_PUBLIC_CLARITY_ID`.
8. **Document vault storage — MinIO in development, Cloudflare R2 in production**,
   selected by environment. Both are S3-compatible, so one client with a swapped endpoint.
   `.env.example` must document both blocks and say which is which.

### 8.9 New requirements for the rebuild

- **PostHog, from the start.** Not retrofitted. Event taxonomy defined before the first
  event fires (see §3.5).
- **User action logging as a first-class feature, from the start.** Every significant user
  action is logged and viewable by `admin` and `staff` in the console. Exists in v1 as a
  late addition (`audit-logs` collection, `lib/audit.ts`, `dashboard/*/audit-logs`), but
  was bolted on. This time it is designed in Phase 1 and every subsequent feature writes
  to it as it is built.

  Note the distinction to preserve in the docs: **audit logs are a compliance record**
  (immutable, NDPA-relevant, who-saw-whose-ID) while **PostHog is product analytics**
  (aggregate, behavioural, no PII). They are not the same system and must never be
  conflated. An action can warrant both, one, or neither.

### 8.10 Open — Concierge is being sold but does not exist

The live site currently offers the **Concierge Plan at KSh 15,000** with "Dedicated
Shortlist Curation" and "Interview Coordination". The positioning doc adds a 30-day
One-Time Replacement Guarantee. No code implements any of it — no job-requests collection,
no case queue, no match report, no replacement workflow.

Scope call needed for the rebuild, and it is a commercial exposure question, not just a
technical one.
