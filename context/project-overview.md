# Project Overview

## Purpose

This file explains what the application is, what problem it solves, who it is
for, and what is explicitly in and out of scope. Read it first, before any other
context file, to understand *why* the project exists before dealing with *how*
it is built.

Where this file and any other context file disagree about **what the product
does**, this file wins. Where they disagree about **how it is built**,
`architecture.md` wins.

---

## About the Project

Mjakazi Connect is a **high-trust digital bureau** for domestic employment in
Kenya. It connects households (**Waajiri**) with domestic workers (**Wajakazi**)
inside a verified, document-backed environment.

It is deliberately not an open marketplace. It is a walled garden where every
worker profile that appears publicly has had their National ID and Certificate
of Good Conduct reviewed by staff, and where an employer pays a time-bound access
fee before any contact details are released. The model virtualizes the
traditional Kenyan domestic-help bureau: the waiting room and the filing cabinet
move to the cloud, the trust stays.

The product should feel like a bank, not a classifieds site. Refined, secure,
empowering. "LinkedIn for the Kenyan home."

---

## The Problem It Solves

Hiring domestic help in Kenya runs on word of mouth. A household asks a
neighbour, who asks a friend, and someone arrives at the door with no verifiable
identity, no background check, and no accountability. The alternative is a
physical agency: slow, geographically limited, and expensive.

Workers face the mirror image. A career-minded Mjakazi with real experience and
clean papers has no way to prove any of it, and no way to reach households
outside walking distance of one local office.

Mjakazi Connect fixes both sides with the same mechanism: **document-backed
verification, held centrally, released deliberately.** Workers get a professional
digital identity that travels nationally. Households get a searchable, vetted
directory instead of a rumour.

---

## Key Terminology

These are Swahili words used as product terms. Get them wrong in UI copy and the
product loses credibility with its own users. Never anglicize the plurals.

| Term | Meaning | Notes |
|---|---|---|
| **Mjakazi** | domestic worker, singular | Never "Mjakazis" |
| **Wajakazi** | domestic workers, plural | The plural of Mjakazi |
| **Mwajiri** | employer / household, singular | Never "Mwajiris" |
| **Waajiri** | employers / households, plural | The plural of Mwajiri |
| **Access Fee** | what a Mwajiri pays to unlock contacts | Time-bound, never recurring |
| **Contact Vault** | the protected part of a profile holding phone and email | |
| **Document Vault** | encrypted storage for National ID and Certificate of Good Conduct | Staff-only |
| **Verified badge** | awarded after staff review, valid 12 months | Tied to Certificate validity |

In sentence copy the terms are lower-case (`a mjakazi`, `verified wajakazi`)
except at the start of a sentence. In headings and labels they are capitalized.

---

## User Roles

Four roles. One role per person, never more.

| Role | Who | Where they work |
|---|---|---|
| `admin` | Super Admin. The platform owner. | `/dashboard/admin` and the Payload panel |
| `staff` | Back-office. Verification reviewers, concierge handlers, content authors. | `/dashboard/staff` and the Payload panel |
| `mwajiri` | Employer. Browses, subscribes, unlocks contacts, reviews. | `/dashboard/mwajiri` |
| `mjakazi` | Worker. Builds a profile, uploads documents, gets verified. | `/dashboard/mjakazi` |

`admin` and `staff` differ in authority, not in day-to-day work. Both do
verification review, concierge cases, moderation and marketing content. Only
`admin` sets pricing and platform settings, manages staff accounts, blacklists,
or overrides a state machine.

### Moderation authority

| Action | `admin` | `staff` |
|---|---|---|
| Suspend a mwajiri or mjakazi account | yes | yes |
| Reinstate a suspended mwajiri or mjakazi | yes | no |
| Delete a mwajiri or mjakazi account | yes | no |
| Suspend, reinstate or delete a staff account | yes | no |
| Blacklist any account | yes | no |
| Create a staff account | yes | no |

The asymmetry is deliberate. Staff can stop something happening immediately,
which is what moderation needs. Undoing it, and anything terminal, requires
`admin`. Every action in this table writes an audit entry with a mandatory
reason.

### Admin panel access

`admin` and `staff` both reach the Payload panel at `/admin` and both author
marketing content there.

A `mwajiri` or `mjakazi` who reaches `/admin` is redirected, never shown an error
and never signed out:

- **Signed in** → their own dashboard, session intact.
- **Not signed in** → the homepage.

The session survives either way. Losing a session because someone mistyped a URL
costs more than it protects.

---

## The Two Halves

The application is one deployment containing two products that must coexist
without contaminating each other.

**The marketing site** is a public, CMS-driven, SEO-critical website. Pages,
posts, categories, calls to action, header, footer and branding are all edited by
staff in the Payload admin panel. It is what a stranger meets first, and its job
is to convert them into a registration.

**The SaaS application** is the authenticated product: dashboards, the directory,
verification, payments, the contact vault. It is not CMS-driven. Its content is
user data governed by state machines.

They share a design system, a domain, a user session and a database. They share
nothing else. Marketing pages never query domain state; SaaS pages never render
CMS blocks.

**Current build state.** The marketing site is already built and live. Two pieces
are missing and are the only marketing work in this rebuild:

- `/directory` — the public directory.
- **Latest Verified Profiles** — a homepage block showing the most recently
  verified wajakazi.

Both read verified profile data, so they are the one place where the marketing
half legitimately touches domain state. They read it through the same guarded
path the SaaS half uses, never by querying profiles directly, and they never
return contact fields.

---

## Pages & Routes

### Marketing — public

| Route | Purpose |
|---|---|
| `/` | Homepage. Hero, why-us, how-it-works, Latest Verified Profiles, pricing, testimonials, blog teaser, CTA. |
| `/directory` | Public directory of verified, available wajakazi, most recently verified first. Contacts masked. |
| `/directory/[slug]` | Public profile detail. Contacts masked. |
| `/posts` | Blog index. |
| `/posts/[slug]` | Blog post. |
| `/[slug]` | CMS-driven pages: terms of service, privacy policy, and any future page. |
| `/registration` | Role chooser. Two cards ("Join as Mwajiri" / "Join as Mjakazi"), managed in the CMS via the `registration` block. |

### Auth

| Route | Purpose |
|---|---|
| `/sign-up` | Clerk sign-up. Requires a `?role=` parameter; without one, renders the chooser. |
| `/sign-in` | Clerk sign-in. |
| `/post-auth` | Server-side. Promotes role, resolves identity, dispatches by role. |
| `/sign-out` | Clears the Clerk session. |

### SaaS — Mjakazi

| Route | Purpose |
|---|---|
| `/dashboard/mjakazi` | Status at a glance: verification state, profile completeness, interest received. |
| `/dashboard/mjakazi/profile` | Profile form. |
| `/dashboard/mjakazi/documents` | Upload National ID and Certificate of Good Conduct. |
| `/dashboard/mjakazi/verification` | Submit for verification, pay the fee, track state. |
| `/dashboard/mjakazi/opportunities` | Availability toggle and expressions of interest received. |
| `/dashboard/mjakazi/settings` | Account settings, deletion request. |

### SaaS — Mwajiri

| Route | Purpose |
|---|---|
| `/dashboard/mwajiri` | Subscription status, recent unlocks, concierge case if any. |
| `/dashboard/mwajiri/browse` | Full directory with filters. Contacts unlockable when active. |
| `/dashboard/mwajiri/browse/[id]` | Profile detail with contact reveal. |
| `/dashboard/mwajiri/subscription` | Current plan, purchase, history. |
| `/dashboard/mwajiri/concierge` | Requirements brief and delivered shortlist. Tier 3 only. |
| `/dashboard/mwajiri/settings` | Account settings, deletion request. |

### SaaS — Staff

| Route | Purpose |
|---|---|
| `/dashboard/staff` | Work queue summary: verifications pending, concierge cases open. |
| `/dashboard/staff/verifications` | Verification review queue. |
| `/dashboard/staff/concierge` | Concierge case queue and shortlist builder. |
| `/dashboard/staff/accounts` | Read and moderate wajakazi and waajiri accounts. |
| `/dashboard/staff/reviews` | Review moderation queue. |
| `/dashboard/staff/audit-logs` | Operational log viewer. |
| `/dashboard/staff/settings` | Own account settings. |

### SaaS — Admin

Everything staff can reach, plus:

| Route | Purpose |
|---|---|
| `/dashboard/admin` | Platform overview: accounts, verification throughput, and a running total of all payments received, split by verification fees and subscriptions. |
| `/dashboard/admin/staff` | Create, edit and remove staff accounts. |
| `/dashboard/admin/settings` | Pricing, tier durations, verification fee, platform settings. |

### Payload

| Route | Purpose |
|---|---|
| `/admin` | Payload admin panel. Marketing content, media, redirects. `admin` and `staff` only. |

---

## Navigation

**Marketing**: fixed 72px header, full width. Left: logo. Centre: Find Wajakazi,
Pricing, How It Works, Blog. Right: Sign In, Register. Collapses to a sheet menu
below `md`.

**SaaS**: collapsible left sidebar with a topbar. Sidebar sections are grouped
and labelled, and the item set is role-specific. Footer of the sidebar carries
the user chip with role beneath the name.

No sidebar on marketing. No marketing header on SaaS.

---

## Core User Flows

### Registration

A stranger reaches `/registration` and picks a side. The page is managed in the
CMS through the `registration` block, which renders two cards:

- "Join as Mwajiri" → `/sign-up?role=mwajiri`
- "Join as Mjakazi" → `/sign-up?role=mjakazi`

The role parameter is an **intent signal only**, carried through Clerk sign-up in
`unsafeMetadata`. It is validated server-side against an allowlist of exactly
`mjakazi | mwajiri` before it becomes real. Nothing a browser sends can produce
`admin` or `staff`.

Reaching `/sign-up` without a role parameter renders the chooser. It never
guesses.

After sign-up, `/post-auth` promotes the role, waits for the identity record to
exist, and dispatches to the correct dashboard. Anyone who arrives without a
resolvable role is re-prompted, not stranded.

Staff and admin accounts are never self-registered. `admin` creates them.

### Mjakazi — from stranger to verified

1. Registers, lands on `/dashboard/mjakazi`. Verification state is `draft`.
2. Completes the profile: legal name, date of birth, nationality, marital status,
   religion, phone, photo, jobs/skills, about, years of experience, education,
   languages, work preference, availability date, salary range, location.
3. Uploads National ID and Certificate of Good Conduct to the document vault.
4. Submits for verification → `pending_payment`.
5. Pays KSh 1,500 by M-Pesa STK push. On **confirmed callback** →
   `pending_review`. Documents lock against further edits.
6. Staff review. Approve → `verified`, expiry set 12 months out, profile becomes
   publicly visible if availability is `available`. Reject → `rejected` with a
   reason; the worker may re-upload and resubmit up to 3 attempts without paying
   again.
7. At 12 months → `verification_expired` automatically. Badge removed, profile
   hidden, worker notified, fresh Certificate required.

A verified worker who changes their legal name or ID reverts to `pending_review`.

### Mjakazi — day to day

Toggles availability between **Available**, **Hired** and **On a Break**. Only
Available appears in the directory. Hired means they have found employment and is
shown on their profile as such. Receives expressions of interest and accepts or
rejects each one. May request account deletion at any time.

### Expressions of interest

A Mwajiri with an active subscription selects **3 to 5 wajakazi** and sends an
expression of interest to each as a single batch. It appears on each Mjakazi's
Opportunities screen, where they accept or reject it.

The batch shape is deliberate: it mirrors the concierge shortlist, sets the
expectation that not everyone will say yes, and stops the directory becoming a
firehose of speculative single pings.

Both parties are emailed on send and on response, each with what happened and
what to do next.

### Hire confirmation

The hire is the thing the business exists to produce, and it happens off-platform
where nothing can observe it. Confirmation is therefore driven from both sides
rather than relying on one party remembering.

- **Either party may confirm.** A Mwajiri marks a hire from their dashboard. A
  Mjakazi setting availability to **Hired** is asked who hired them, offering the
  waajiri who unlocked their contact or sent an expression of interest.
- **The Mjakazi's signal is the stronger one.** They know with certainty, and
  they benefit immediately — being marked Hired stops irrelevant interest
  arriving. The Mwajiri has no comparable incentive, which is why "honour bound"
  alone is not enough to build a metric on.
- **Both are nudged.** Seven and fourteen days after an accepted expression of
  interest, both parties receive a single email asking whether it resulted in a
  hire. Two nudges, then silence.
- **Confirmation from either side sets the same state**: the Mjakazi's
  availability becomes Hired, they leave the public directory, and the match is
  recorded against the Mwajiri's subscription. Confirmation by one side is
  surfaced to the other for agreement, never silently applied against them.
- Both parties are emailed on confirmation, including what happens next and how
  to reverse it if the placement does not hold.

This is what makes Match Conversion Rate measurable, and it is the same event the
concierge replacement guarantee counts from.

### Mwajiri — from stranger to hire

1. Registers, lands on `/dashboard/mwajiri`. Subscription state is `none`.
2. Browses the directory freely. Profiles, photos, skills, location, experience
   and salary expectations are all visible. Phone and email are masked.
3. Chooses a plan and pays by M-Pesa STK push. On **confirmed callback** →
   `active`, with an expiry date.
4. Unlocks contacts. Each unlock is permanent, recorded, and audit-logged.
5. Expresses interest in specific wajakazi. Each is accepted or rejected.
6. Contacts the worker directly and arranges interviews themselves. The platform
   handles no logistics.
7. Confirms the outcome. Either party can record the hire — see Hire
   Confirmation below.
8. Leaves a review of any Mjakazi whose contact they unlocked.

At expiry → `expired`. Previously unlocked contacts remain visible permanently.
New unlocks require a new purchase.

### Concierge — Tier 3 only

Staff-assisted matching, layered on top of ordinary Tier 3 access. A Concierge
subscriber can still browse and unlock normally; the service is additive.

```
Tier 3 payment confirmed
        ↓
[intake]                case created automatically; Mwajiri completes a
                        requirements brief
        ↓
[in_review]             a staff member claims the case and builds a shortlist
                        from verified profiles, with a one-line note per
                        candidate explaining the match
        ↓
[shortlist_delivered]   shortlist appears on the Mwajiri dashboard; contacts for
                        shortlisted candidates unlock automatically
        ↓
[closed]                Mwajiri records the outcome: hired, or none suitable
        ↓
[replacement_requested] once only, within 30 days of a confirmed hire; reopens
                        the same case rather than granting a new window
```

Defaults: shortlist of 3–5 candidates, first shortlist delivered within 5 working
days of a completed brief.

Delivering a shortlist writes ordinary contact-unlock records. There is no
parallel access mechanism, so the no-refund position holds identically: access
delivered is service delivered.

### Staff — verification review

Works a queue of profiles in `pending_review`, oldest first. Opens a case, views
the National ID and Certificate side by side, checks the legal name against the
document, and approves or rejects with a reason. Every document view is
audit-logged with the reviewer's identity. Target turnaround is under 48 hours
from payment confirmation.

### Admin

Everything staff do, plus creating and removing staff, setting prices and tier
durations, blacklisting accounts, and overriding a state machine when reality
demands it. Every override is audit-logged with a mandatory reason.

---

## Commercial Model

### Mjakazi — verification fee

**KSh 1,500**, one time, per verification cycle. Buys staff review of documents
and, on approval, a Verified badge valid 12 months. Re-verification after expiry
is a fresh fee. Rejection does not consume the fee — up to 3 resubmissions are
included.

Listing is free. Being *found* is not: an unverified profile never appears in the
directory.

### Mwajiri — access fee

| Plan | Price | Duration | Includes |
|---|---|---|---|
| Essentials | KSh 5,000 | 14 days | Directory access, contact reveal, email support |
| Standard | KSh 8,000 | 28 days | The above, plus profile bookmarking, and email, phone and WhatsApp support |
| Concierge | KSh 15,000 | 42 days | The above, plus staff-assisted shortlisting, interview coordination, and a one-time 30-day replacement guarantee |

Unlocks are unlimited within an active window.

### Policies — binding, and reflected in code

- **No auto-renewal.** Access expires. Nothing recurring is ever created. The
  codebase contains no recurring-billing primitives.
- **No cash refunds.** Access to the vault constitutes delivery of service.
- **Stacking, not pro-rating.** Buying while active appends the new duration to
  the existing expiry. No credit is calculated, no refund is issued on a
  downgrade.
- **Permanent unlocks.** A contact revealed during an active window stays visible
  after expiry. New reveals require a new active window.
- **Replacement guarantee.** Concierge only, once, within 30 days of a confirmed
  hire.

### Payment rail

M-Pesa STK Push via the Safaricom Daraja API, direct. The **callback is the only
thing that confirms a payment**. No frontend response, no optimistic UI state,
and no manual toggle grants access to anything.

---

## Trust & Verification

The Verified badge is the entire product. Everything else is delivery mechanism.

- Verification means a staff member has looked at a National ID and a Certificate
  of Good Conduct and matched them to the profile.
- The badge is valid 12 months, matching Certificate of Good Conduct validity.
- Expiry is automatic and unforgiving. An expired profile disappears from the
  directory.
- Blacklisting is terminal. Only `admin` can reverse it.
- A profile is publicly visible only when verification is `verified` **and**
  availability is `available` **and** the account is neither blacklisted nor
  deactivated. Any other combination means fully invisible, not partially.

---

## Data Sovereignty

Mjakazi Connect is a Data Controller under the Kenya Data Protection Act 2019.
National IDs and Certificates of Good Conduct are sensitive personal data.

Summarized here; binding rules live in `architecture.md`:

- Documents are held in private, S3-compatible storage and served only through
  authenticated, short-lived signed URLs. Never a public URL, ever.
- Only `staff` and `admin` may view a document, and every view writes an audit
  entry naming the viewer, the subject and the time.
- Phone numbers, ID numbers and documents are never indexed by search engines and
  never appear in an analytics event.
- Account deletion nullifies personal data. Transaction records are retained for
  statutory audit.

---

## Operational Logging vs Product Analytics

Two separate systems. Never conflated, never merged, never used for each other's
job.

**Audit logs** are the operational and compliance record, stored in the database,
immutable, and viewable in the console by `staff` and `admin`. They answer "what
amount was paid, by whom, and when", "who viewed whose National ID", "whose
profile was deleted and when", "who approved this verification". Every state
transition, every document view, every contact reveal, every admin override
writes one.

**PostHog** is product analytics. It answers "which filters do people actually
use", "where does the registration funnel leak", "how often is the directory
searched". Aggregate and behavioural.

**No personally identifying data ever enters PostHog.** No phone number, no
ID number, no document URL, no email address, no full name. An event may carry a
user identifier and non-identifying properties, nothing more.

An action may warrant an audit entry, a PostHog event, both, or neither. Deciding
which is part of building the feature, not an afterthought.

---

## Features In Scope

**Marketing**
- CMS-driven homepage with hero, value props, how-it-works, pricing, testimonials
  and blog teaser
- Public directory and profile detail with masked contacts, newest verified first
- Latest Verified Profiles homepage block
- Blog with categories
- CMS-driven pages including terms of service and privacy policy
- SEO: sitemaps, metadata, redirects
- Registration role chooser

**Identity**
- Clerk authentication with Google OAuth and email/password
- Server-side role promotion with an enforced allowlist
- Role-based dispatch and route protection
- Admin-created staff accounts

**Mjakazi**
- Full profile with skills, languages, education, salary expectations, location
- Document vault upload
- Eight-state verification lifecycle
- KSh 1,500 verification payment by M-Pesa
- Availability states: available, hired, on a break
- Expressions of interest: receive, accept, reject
- Hire confirmation, with attribution to the hiring mwajiri
- Account deletion request

**Mwajiri**
- Directory browse with category, location and experience filters
- Six-state subscription lifecycle
- Three tiers purchased by M-Pesa, with stacking
- Contact vault reveal, permanently durable
- Expressions of interest: send, in batches of 3 to 5
- Hire confirmation
- Reviews of unlocked wajakazi
- Concierge brief and shortlist, Tier 3

**Staff and Admin**
- Verification review queue with document viewer
- Concierge case queue and shortlist builder
- Review moderation
- Account moderation: suspend, reinstate, delete, blacklist, per the authority
  matrix above
- Audit log viewer
- Staff management, platform settings and running payment totals (admin only)
- Marketing content authoring in the Payload panel

**Platform**
- M-Pesa Daraja STK push with callback confirmation and idempotency
- Inngest jobs: verification expiry, subscription expiry, payment timeout
- Transactional email via Resend
- Audit logging on every sensitive action
- PostHog analytics from the first feature

## Features Out of Scope

- **Job postings.** Waajiri do not post vacancies and wajakazi do not apply. The
  copy currently on the live site footer is stale and is removed.
- **In-app messaging.** Contact happens off-platform after unlock. Expressions of
  interest are a signal, not a chat.
- **Transport, relocation or logistics.** Logistical neutrality is a stated
  position, not an omission.
- **Contracts, payroll or salary payments.** The platform never holds employment
  money.
- **Auto-renewing subscriptions.** Explicitly, permanently excluded.
- **Cash refunds.**
- **Escrow.**
- **Mobile applications.** Mobile-first web only.
- **Multi-user or agency Mwajiri accounts.** One human, one account.
- **Multi-country.** Kenya only.
- **Kiswahili interface.** English only for now.
- **Third-party automated background checks.** Verification is staff review of
  submitted documents.

---

## Success Criteria

The rebuild is done when all of the following are true.

- A stranger can register as either role, and never lands in the wrong one.
- A Mjakazi can go from registration to Verified without staff intervention
  beyond the review itself.
- No profile is publicly visible without a confirmed payment and a staff approval
  behind it.
- A Mwajiri can pay by M-Pesa and gain access within seconds of confirming on
  their handset.
- Contact details are unreachable without an active subscription — not merely
  hidden in the UI, but absent from every API response and every server-rendered
  payload.
- A duplicate M-Pesa callback never grants access twice.
- Every document view, contact reveal, payment and admin action is in the audit
  log, and staff can read it.
- Verification and subscription both expire on their own, without anyone
  remembering to run something.
- Staff can review a verification without being able to enumerate every
  employer's email address.
- The marketing site is fully editable by staff without a deploy.
- The interface matches `ui-tokens.md` and `ui-rules.md` with no hardcoded
  colours anywhere.

## Metrics

**North Star — Match Conversion Rate.** The percentage of subscribed waajiri who
confirm a hire within their access window. This requires a hire-confirmation
event; without one the metric is unmeasurable, which is why outcome confirmation
is in scope rather than deferred.

**Operational**
- Verification velocity: payment confirmed → Verified. Target under 48 hours.
- Supply liquidity: verified available wajakazi per active mwajiri, per category.
- Tier migration: proportion starting at Essentials who buy up.
- Concierge efficiency: brief completed → shortlist delivered. Target 5 working
  days.
- Replacement rate: proportion of concierge hires triggering the guarantee.
  Lower is better.

---

## Target Users

**The Discerning Mwajiri.** An urban or suburban household anywhere in Kenya,
frustrated by the opacity of word-of-mouth hiring, unwilling to pay agency
commissions or wait on a manual process. Comfortable paying for certainty.

**The Professional Mjakazi.** A career-minded domestic worker with real
experience and clean papers, seeking to differentiate on verified credentials and
reach better-paying households without being tied to one physical office.
