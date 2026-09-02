# Architecture

## Purpose

This file defines the technical shape of the project: the stack, how the codebase is
organized, where the system boundaries are, how data flows, the data schema, and the rules
an agent must never violate.

Read it before writing any code that touches structure, data, identity, money or
documents.

Precedence: `project-overview.md` wins on **what the product does**. This file wins on
**how it is built**. Where a rule here conflicts with a design asset in `/interface`, the
design asset wins on visual matters only. The Invariants section at the end of this file
is not overridden by anything.

---

## Tech Stack

Versions are pinned as installed. Do not upgrade a major version as part of a feature
task.

| Layer           | Tool                                                  | Version        | Purpose                                         |
| --------------- | ----------------------------------------------------- | -------------- | ----------------------------------------------- |
| Framework       | Next.js (App Router)                                  | 16.2.12        | Full-stack framework                            |
| Runtime         | React                                                 | 19.2.8         | Server Components by default                    |
| Language        | TypeScript                                            | 6.0.3, strict  | Throughout                                      |
| CMS / backend   | Payload CMS                                           | 3.87.0         | Collections, admin panel, local API, job queue  |
| Database        | MongoDB                                               | —              | `@payloadcms/db-mongodb`, single `DATABASE_URL` |
| Identity        | `@clerk/nextjs` / `@clerk/backend`                    | 7.6.3 / 3.15.0 | Auth, sessions, credentials                     |
| Styling         | Tailwind CSS                                          | 4.3.3          | With Shadcn/UI                                  |
| UI primitives   | `@base-ui/react`                                      | 1.7.x          | Shadcn 4 sits on Base UI, **not Radix**         |
| Icons           | lucide-react                                          | 1.28.x         | The only icon set                               |
| Animation       | motion                                                | 12.43.x        | Sparingly — see `ui-rules.md`                   |
| Background jobs | **Payload job queue**                                 | built in       | `jobs.autoRun`, cron `* * * * *`, limit 10      |
| Payments        | M-Pesa Daraja                                         | —              | Direct STK Push, hand-rolled client             |
| Email           | Resend                                                | —              | Via `@payloadcms/email-resend`                  |
| Storage         | `@payloadcms/storage-s3`                              | 3.87.0         | MinIO in dev, Cloudflare R2 in production       |
| SEO             | `@payloadcms/plugin-seo`, `next-sitemap`              | —              | Metadata, canonical URLs, sitemaps              |
| Redirects       | `@payloadcms/plugin-redirects`                        | —              |                                                 |
| Rich text       | Lexical                                               | 3.87.0         | Payload's editor                                |
| Images          | sharp                                                 | 0.35.3         | Payload media processing                        |
| Releases        | semantic-release                                      | 25.x           | Conventional Commits required                   |
| Infrastructure  | Contabo VPS, Ubuntu 24.04, Docker, Traefik, Portainer | —              | Self-hosted                                     |

### To be installed

Not yet present. Install once, at the start, not feature by feature.

| Package                                  | Why                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `posthog-js`, `posthog-node`             | Analytics. Browser and server clients.                                |
| `zod`                                    | Boundary validation. Every route handler body, every webhook payload. |
| `react-hook-form`, `@hookform/resolvers` | The Mjakazi profile alone is ~20 fields.                              |
| `date-fns`                               | Expiry arithmetic. No moment, no dayjs.                               |

### Explicitly not used

- **Any third-party job scheduler.** Payload's queue covers every scheduled task in this
  project. Do not add one.
- **Radix UI.** Shadcn 4 uses Base UI. Never `npm install @radix-ui/*`.
- **Microsoft Clarity.** Superseded by PostHog.

---

## Folder Structure

Mapped from the scaffolded project, not invented. Entries marked **new** do not exist yet
and are created during this build; everything else is already there.

```
/
├── AGENTS.md
├── context/                                  → this documentation set
├── .agents/skills/                           → architect, clerk-*, payload, shadcn
├── src/
│   ├── payload.config.ts
│   ├── payload-types.ts                      → generated. the source of every type.
│   ├── proxy.ts                              → Clerk middleware (NOT middleware.ts)
│   ├── globals.css
│   ├── css-variables.js
│   ├── app/
│   │   ├── (web)/                            → public marketing. Own root layout.
│   │   │   ├── layout.tsx  page.tsx  template.tsx  not-found.tsx
│   │   │   ├── [slug]/                       → CMS pages
│   │   │   ├── posts/[slug]/
│   │   │   ├── next/{preview,exit-preview}/
│   │   │   └── directory/                    → new: index + [slug]
│   │   ├── (auth)/                           → Own root layout.
│   │   │   ├── sign-in/[[...sign-in]]/
│   │   │   ├── sign-out/
│   │   │   ├── sign-up/[[...sign-up]]/       → new
│   │   │   └── post-auth/route.ts            → new: promote role, dispatch
│   │   ├── (saas)/                           → Own root layout.
│   │   │   ├── layout.tsx
│   │   │   └── dashboard/
│   │   │       ├── page.tsx                  → exists; becomes a role redirector
│   │   │       ├── mjakazi/                  → new
│   │   │       ├── mwajiri/                  → new
│   │   │       ├── staff/                    → new
│   │   │       └── admin/                    → new
│   │   ├── (payload)/
│   │   │   ├── layout.tsx                    → Payload-generated; guarded. Commit it.
│   │   │   ├── custom.scss
│   │   │   ├── admin/[[...segments]]/
│   │   │   └── api/                          → THE api namespace. Everything lives here.
│   │   │       ├── [...slug]/route.ts        → Payload REST catch-all
│   │   │       ├── graphql/  graphql-playground/
│   │   │       ├── webhooks/                 → inbound, third-party, no session
│   │   │       │   ├── clerk/route.ts
│   │   │       │   └── payments/callback/route.ts   → scaffolded, empty
│   │   │       └── actions/                  → new. See the namespacing note below.
│   │   ├── (sitemaps)/
│   │   └── actions/                          → Server Actions. Scaffolded, empty.
│   ├── payload/
│   │   ├── access/access-control.ts          → every access rule, one file
│   │   ├── collections/                      → calls-to-action, categories, media,
│   │   │                                       pages, posts, users (+ new domain ones)
│   │   ├── blocks/                           → banner, call-to-action, code,
│   │   │                                       content-editor, features, hero,
│   │   │                                       how-it-works, media, posts-archive,
│   │   │                                       pricing, registration, testimonials,
│   │   │                                       globals/{branding,header,footer}
│   │   ├── fields/                           → lexical, link, resend, slug
│   │   ├── hooks/                            → clerk-sync, revalidate-*, populate-*
│   │   ├── strategy/clerk-strategy.ts
│   │   ├── plugins/schema.ts
│   │   └── utilities/                        → incl. request-context.ts (loop guard)
│   ├── services/                             → new. The domain layer.
│   ├── jobs/                                 → new. Payload queue task handlers.
│   ├── components/
│   │   ├── ui/                               → Shadcn. 9 present; add as needed.
│   │   ├── admin/                            → clerk-admin-provider,
│   │   │                                       custom-signout-button,
│   │   │                                       get-current-user.ts
│   │   ├── payload/                          → icon, link, media, rich-text,
│   │   │                                       live-preview-listener, redirects
│   │   ├── providers/theme-provider.tsx
│   │   ├── container.tsx
│   │   ├── web/                              → new: marketing components
│   │   └── dashboard/                        → new: SaaS components, by role
│   └── lib/                                  → fonts.ts, utils.ts (+ mpesa, audit,
│                                               posthog, profile-constants — new)
└── public/
```

### There is no `src/types`

Types come from `src/payload-types.ts`, which Payload generates. Derive from it —
`type Role = NonNullable<User["role"]>` — rather than declaring a parallel type that will
drift. Run `pnpm generate:types` after every schema change.

### There is no `src/app/layout.tsx`

Payload's `RootLayout` renders `html` and `body` itself, so a shared root layout would
mount them twice. Each route group renders its own document. `globals.css` is imported per
group, never hoisted, or Tailwind's preflight lands on the Payload admin panel and fights
its stylesheet. Both `html` and `body` carry `suppressHydrationWarning`; it does not
cascade.

### API namespacing — read before adding a route

Every HTTP endpoint lives under `src/app/(payload)/api/`. That directory already contains
Payload's own `[...slug]` catch-all, which serves `/api/{collection-slug}` for **every**
collection. Payload's REST API and our route handlers therefore share one URL namespace.

A file route beats the catch-all in Next.js resolution, so `/api/payments/initiate` would
work — but `payments` is also a collection slug, which makes `/api/payments` mean two
different things depending on the path depth. That is a trap, not a design.

Two subdirectories, and nothing else:

- **`api/webhooks/{provider}/`** — inbound calls from a third party. No session.
  Signature-verified. Currently `clerk` and `payments/callback`.
- **`api/actions/{domain}/{verb}/`** — our own endpoints, e.g.
  `/api/actions/verification/submit`, `/api/actions/contact/reveal`. The `actions` segment
  is not a collection slug and never will be, so nothing here can ever shadow Payload's
  REST surface.

**Prefer a Server Action in `src/app/actions/` over a route handler.** Reach for a route
only when the caller is a third party, when the response is a stream or file, or when
something outside React needs to call it.

Layouts do not wrap route handlers, so the `(payload)` layout guard does not protect
anything under `api/`. Every route authorizes itself.

---

## Identity Architecture

Clerk owns identity, sessions and credentials. Payload owns the user record and is the
management surface. There is **one identity record per human**.

The v1 codebase split this across a `users` collection with native Payload auth and a
separate `accounts` collection mirroring Clerk. That produced two identities per person,
wide-open access rules on `users`, and `(user as any).role` casts throughout. Both
collections are replaced by a single `users` collection. **`accounts` does not exist in
this build.**

### The four moving parts

**1. Auth strategy** (`src/payload/strategy/clerk-strategy.ts`). A custom Payload
`AuthStrategy` verifies the Clerk session on every request and resolves the matching
Payload user by `clerkId`. If no record exists yet — the webhook has not landed — it
provisions one inline from Clerk's data rather than stranding the user.
`createClerkClient` must receive **both** the publishable key and the secret key, and
`authorizedParties` must match the browsing origin exactly, including the bare and `www.`
variants that Traefik routes to the same app.

It **never invents a role**. If `publicMetadata.role` is absent or unrecognized it logs
and returns `{ user: null }`, which sends the user back through `/post-auth` to choose.
There is no neutral role to fall back to.

**2. Webhook** (`src/app/(payload)/api/webhooks/clerk/route.ts`). Handles `user.created`,
`user.updated`, `user.deleted` for changes originating in Clerk. Signature-verified with
`verifyWebhook`. Maintains the `users` record only — domain profiles are created by
`identity.service.ts` from `/post-auth`.

**Sequencing.** Clerk fires `user.created` the instant sign-up completes, which is
_before_ `/post-auth` has promoted the role. That event carries no role and is
deliberately skipped with a 200, so Clerk does not retry a condition that resolves on its
own. The record is then created by whichever path wins: `/post-auth` calling
`updateUserMetadata` fires `user.updated` with the role present, or the auth strategy
provisions inline on the next request. Both key on `clerkId` and are idempotent, so the
race is harmless.

On update, `role` is written **only** when Clerk carries a valid one. Payload is
authoritative, so an empty or unrecognized metadata value must never clear a role that is
already set — otherwise a Clerk-side profile edit could silently strip someone's
permissions.

**3. Sync hooks** (`src/payload/hooks/clerk-sync.ts`). Collection hooks on `users` create,
update and delete the Clerk identity when an admin acts in the Payload panel. Passwords
are passed to Clerk and stripped before persistence — a password is never written to
MongoDB.

**4. Loop guard** (`src/payload/utilities/request-context.ts`). A `fromClerkWebhook` flag
on Payload's request context distinguishes inbound webhook writes from admin-originated
ones. Without it, the two systems write to each other indefinitely.

### Role authority

**Payload is authoritative.** `users.role` is the source of truth. Clerk
`publicMetadata.role` is a mirror, maintained by the sync hook, used only as a cheap
client-side rendering hint. **It never authorizes anything.**

`role` carries field-level access (`create` and `update` restricted to `admin`), because
collection-level update permits a user to edit their own record. Without the field-level
lock, any user can promote themselves.

### Registration and role promotion

```
/registration              role chooser, two buttons
      ↓
/sign-up?role=mjakazi      Clerk <SignUp unsafeMetadata={{ role }} />
      ↓                    no role param → render the chooser, never guess
/post-auth  (server)       1. read unsafeMetadata.role
                           2. validate against ['mjakazi','mwajiri']
                           3. if publicMetadata.role already set, do not overwrite
                           4. promote to publicMetadata, null out unsafeMetadata
                           5. resolve the Payload user, with retry for webhook lag
                           6. redirect by role
```

`unsafeMetadata` is client-writable. It is a **declaration of intent, never an
authorization**. The allowlist is typed `'mjakazi' | 'mwajiri'` and is the only path by
which a self-registering user acquires a role. Nothing a browser sends can produce `admin`
or `staff`.

The promotion runs **server-side inside `/post-auth`**. It is not a client component
fetching an endpoint — that design lets a user abandon mid-flight and end up with a
session and no role, unable to recover. There is no `/authenticating` page and no
`sessionStorage`.

A user who somehow arrives with no resolvable role is returned to the chooser, never to a
dead end.

### Route protection

Resource-based, not centralized route matching. `createRouteMatcher` is deprecated.
`src/proxy.ts` runs `clerkMiddleware()` and nothing else; the matcher must include
`/__clerk/(.*)` or Clerk's frontend API requests are not handled.

Each protected area guards itself in its own layout:

- `(payload)/layout.tsx` — `auth.protect()`, then `getCurrentUser()`, then require `admin`
  or `staff`. A `mwajiri` or `mjakazi` is redirected to their own dashboard with their
  session intact. Never signed out, never shown Payload's unauthorized screen — its logout
  button clears a `payload-token` cookie that was never issued, so the user would bounce
  forever.
- `(saas)/dashboard/{role}/layout.tsx` — `auth.protect()`, then require the matching role.

Layouts do not wrap route handlers. The Payload REST API and the Clerk webhook are
unaffected by these guards, which is correct: the API is governed by collection access,
and the webhook must stay reachable without a session.

---

## System Boundaries

Four layers. No layer may bypass the one beneath it.

```
Client  →  API / Server Action  →  Domain Service  →  Payload  →  MongoDB
```

| Folder              | Owns                                           | Never does                                                     |
| ------------------- | ---------------------------------------------- | -------------------------------------------------------------- |
| `app/(web)`         | Marketing pages                                | Query domain state directly; render SaaS components            |
| `app/(saas)`        | Dashboard pages                                | Contain business logic; call Payload directly for guarded data |
| `app/(payload)/api` | Request validation, auth, response shaping     | Contain business logic                                         |
| `app/actions`       | Server Actions: validate, delegate, revalidate | Contain business logic                                         |
| `services/`         | All business logic and state transitions       | Import from `components/`; touch React                         |
| `payload/`          | Schema, access rules, hooks                    | Contain workflow logic                                         |
| `components/`       | UI                                             | Fetch data; call the database                                  |
| `lib/`              | Third-party clients, constants, pure functions | Hold state                                                     |
| `jobs/`             | Scheduled work on Payload's queue              | Write to the database directly — it calls services             |

The frontend never changes domain state, never confirms a payment, and never grants
access. A route handler validates and delegates; the service decides.

---

## Data Flow

### Rendering strategy

| Surface                             | Strategy                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| Marketing pages, blog               | Static with on-demand revalidation from Payload hooks on publish             |
| Public directory and profile detail | Dynamic. Filters are query params and verification state changes constantly. |
| Latest Verified Profiles block      | Dynamic, cached briefly. Reads the same guarded path as the directory.       |
| All dashboards                      | Dynamic, per request, uncached                                               |

Nothing that touches a subscription, a verification state or a contact field is ever
statically cached.

### Mutations

**Server Actions in `src/app/actions/`** are the default for UI-triggered mutations:
profile edits, availability toggles, settings, expression-of-interest responses, review
submission, concierge brief.

**Route handlers under `src/app/(payload)/api/`** only when a Server Action cannot do the
job:

- `api/webhooks/*` — a third party is the caller. Clerk, M-Pesa.
- `api/actions/*` — the response is a stream or file, the caller is outside React, or a
  poll is needed. Vault document streaming, payment status polling.

Both delegate to a service. Neither contains business logic.

### The monetized path

```
User selects a plan
      ↓
POST /api/actions/payments/initiate    validates, creates payment (initiated)
      ↓
payment.service → lib/mpesa        STK push → payment (stk_sent)
      ↓
[user enters PIN on handset]
      ↓
POST /api/webhooks/payments/callback   Daraja calls us. No session.
      ↓                            verify → amount, phone, merchant, idempotency
payment.service                    payment (confirmed) — terminal, immutable
      ↓
subscription.service OR verification.service
      ↓                            atomic domain transition + audit log
Access granted
```

**The callback is the only thing that confirms a payment.** Not the STK response, not the
frontend, not an admin toggle, not a polling result. A status poll may update the UI, but
only the callback writes `confirmed`.

---

## Data Schema

Collection slugs are kebab-case and plural. Each collection owns exactly one
responsibility. No duplicated state, no boolean flags where an enum belongs.

### Identity

**`users`** — the single identity record. Payload auth with `disableLocalStrategy: true`
and the Clerk strategy attached.

| Field                             | Type       | Notes                                                                    |
| --------------------------------- | ---------- | ------------------------------------------------------------------------ |
| `clerkId`                         | text       | unique, indexed, never editable                                          |
| `email`                           | email      | required, immutable after creation (Clerk cannot change a primary email) |
| `firstName`, `lastName`           | text       | required                                                                 |
| `name`                            | text       | derived, read-only, for admin display                                    |
| `role`                            | select     | `admin \| staff \| mwajiri \| mjakazi`. Field-level access: admin only.  |
| `accountState`                    | select     | `active \| suspended \| deleted`                                         |
| `suspendedAt`, `suspensionReason` | date, text |                                                                          |
| `password`                        | text       | never persisted. Read by the hook, sent to Clerk, stripped.              |

### Domain profiles

**`wajakazi-profiles`** — 1:1 with a `mjakazi` user.

Identity: `user` (relationship), `displayName`, `legalFirstName`, `legalLastName`,
`dateOfBirth`, `nationality`, `maritalStatus`, `religion`, `phone`, `photo`.

Professional: `jobsSkills` (multi-select), `about`, `yearsExperience`, `educationLevel`,
`languages`, `workPreference`, `availableFrom`, `salaryMin`, `salaryMax`, `location`.

Availability: `availabilityStatus` — `available | hired | on_break`.

Verification (authoritative): `verificationState` —
`draft | pending_payment | pending_review | verified | rejected | verification_expired | blacklisted | deactivated`.
Plus `verificationSubmittedAt`, `verificationReviewedAt`, `verificationExpiry`,
`verificationAttempts`, `rejectionReason`, `verificationNotes`, `blacklistedAt`,
`deactivatedAt`, `lastVerificationPaymentId`, `profileComplete`.

There is **no `isVerified` boolean**. `verificationState` replaces it entirely.

**`waajiri-profiles`** — 1:1 with a `mwajiri` user. `user`, `phone`, `location`,
`blacklistState`, `blacklistedAt`.

Carries no subscription data.

**`staff-profiles`** — created only when staff need attributes beyond `users`. Not built
until a requirement demands it.

### Documents

**`vault-documents`** — encrypted identity documents. Never `media`.

`profile` (relationship), `uploadedBy` (relationship to `users`), `documentType`
(`national_id | certificate_of_good_conduct`), `file`, `uploadedAt`.

Access: `staff` and `admin`, plus the owning Mjakazi. No one else, ever.

### Commerce

**`subscriptions`** — one active record per Mwajiri.

`user`, `subscriptionState`
(`none | pending_payment | active | expired | suspended | blacklisted`), `tier`
(`1 | 2 | 3 | null`), `tierStartedAt`, `tierExpiry`, `suspendedAt`, `suspensionReason`,
`lastPaymentId`.

Stores no amounts.

**`payments`** — immutable once confirmed.

`user`, `paymentType` (`verification | subscription`), `status`
(`initiated | stk_sent | callback_received | confirmed | failed | expired | cancelled`),
`amount` (integer KSh), `tier`, `phoneNumber`, `mpesaReference` (unique),
`merchantRequestId`, `checkoutRequestId`, `callbackPayload` (json), `initiatedAt`,
`confirmedAt`, `failedAt`, `expiredAt`.

**`contact-unlocks`** — durable access grants.

`mwajiri`, `mjakazi`, `tierAtUnlock`, `unlockedAt`, `subscription`, `payment`. Unique on
(`mwajiri`, `mjakazi`).

Unlocks are permanent. A contact revealed during an active window remains visible after
expiry. New reveals require an active subscription.

### Interactions

**`expressions-of-interest`** — `mwajiri`, `mjakazi`, `batchId`, `state`
(`sent | accepted | rejected | expired`), `sentAt`, `respondedAt`. Sent in batches of 3
to 5.

**`hires`** — `mwajiri`, `mjakazi`, `confirmedBy` (`mwajiri | mjakazi`), `confirmedAt`,
`agreedAt`, `sourceEoi`, `sourceConciergeCase`. The event Match Conversion Rate is
measured from, and the clock the replacement guarantee starts.

**`reviews`** — `mwajiri`, `mjakazi`, `rating` (1–5), `comment`, `moderationState`
(`pending | published | rejected`), `moderatedBy`, `createdAt`. Permitted only where a
`contact-unlock` exists. One review per unlock.

**`concierge-cases`** — `mwajiri`, `subscription`, `state`
(`intake | in_review | shortlist_delivered | closed | replacement_requested`), `brief`,
`shortlist` (relationship, hasMany), `shortlistNotes`, `assignedTo`, `deliveredAt`,
`outcome`, `replacementUsedAt`.

### Operations

**`audit-logs`** — immutable. `create`, `update` and `delete` access all return false;
written only through `lib/audit.ts` with `overrideAccess`.

`action`, `performedBy`, `performedByRole`, `target`, `targetType`, `previousState`,
`newState`, `reason`, `metadata` (json), `createdAt`.

Readable by `staff` and `admin`.

### Marketing

Already built and registered: `pages`, `posts`, `categories`, `calls-to-action`, `media`,
`users`, plus the `redirects` plugin. Globals live in `src/payload/blocks/globals`.

To be added: `platform-settings` as a global, holding tier prices, tier durations and the
verification fee. `admin` only.

Everything in the Identity, Domain profiles, Documents, Commerce, Interactions and
Operations sections above is **not yet built**. The marketing half is done; the SaaS half
is greenfield.

`platform-settings` holds tier prices, tier durations and the verification fee. `admin`
only. Prices are never hardcoded in application code.

### Relationships

```
users ──1:1── wajakazi-profiles ──1:many── vault-documents
      └─1:1── waajiri-profiles  ──1:1───── subscriptions ──1:many── payments

contact-unlocks ─── waajiri-profiles + wajakazi-profiles
expressions-of-interest ─── waajiri-profiles + wajakazi-profiles
hires ─── waajiri-profiles + wajakazi-profiles
reviews ─── requires an existing contact-unlock
concierge-cases ─── waajiri-profiles + subscriptions + wajakazi-profiles[]
audit-logs ─── references anything
```

---

## Access Control

Every rule lives in `src/payload/access/access-control.ts`. No access function is declared
inline in a collection.

The helpers, once `payload-types` is generated so `req.user` is properly typed:

| Helper                      | Grants                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `isPublic`                  | everyone                                                                                   |
| `isRestricted`              | nobody — collection sealed, authorized at the service layer                                |
| `isAuthenticated`           | any signed-in user                                                                         |
| `isAdmin`                   | `admin`                                                                                    |
| `isAdminField`              | field-level admin gate; `FieldAccess` may only return a boolean                            |
| `isAdminOrStaff`            | `admin` or `staff` — the admin-panel gate                                                  |
| `isAdminOrStaffField`       | field-level variant                                                                        |
| `isMjakazi`, `isMwajiri`    | the two SaaS roles                                                                         |
| `isAdminOrSelf`             | `admin` sees all; everyone else is scoped to their own record                              |
| `isAdminOrOwner(field)`     | factory; staff bypass, everyone else scoped by the named relation                          |
| `isAdminOrStaffOrPublished` | staff see drafts, everyone else sees published only                                        |
| `isDirectoryVisibleOrOwner` | staff see all; an owner sees their own; everyone else sees only verified **and** available |

**`isAuthenticatedOrPublished` is removed.** It grants draft access to any signed-in user.
In a CMS where the only accounts are editors that is harmless; here every Mwajiri and
Mjakazi is signed in, so using it on `pages` or `posts` would leak unpublished marketing
content to the entire customer base. Use `isAdminOrStaffOrPublished`.

**`users` stays on `isAdminOrSelf`.** Staff do not get blanket read on user records.
Everything staff need lives on the domain collections, where they have explicit access. A
staff member can verify a Mjakazi without being able to enumerate every employer's email
address.

### The contact vault

This is where the revenue model lives, and it needs more than field access.

Payload's Local API defaults to `overrideAccess: true`. `payload.find()` called from a
server component returns everything, including contact fields, and those fields then ship
to the browser inside the RSC payload whether or not anything renders them. Field-level
access will not save us.

Therefore:

1. Contact fields are **never selected by default**. Directory and profile queries pass an
   explicit `select` that omits them.
2. Contact fields are read by exactly one function, in `contact.service.ts`, which checks
   for an active subscription and an existing or newly created unlock before returning
   anything.
3. Every Local API read that can reach a profile passes `overrideAccess: false` and the
   authenticated `req`. The only exemptions are the Clerk strategy, the Clerk webhook and
   `lib/audit.ts` — named here, and nowhere else.
4. Masking is a UI convenience, never a control. The data must be absent from the
   response, not hidden in it.

---

## Document Vault and NDPA

Mjakazi Connect is a Data Controller under the Kenya Data Protection Act 2019. National
IDs and Certificates of Good Conduct are sensitive personal data.

- **Storage.** `@payloadcms/storage-s3`, one bucket, `forcePathStyle: true` for MinIO.
  Development points at local MinIO, production at Cloudflare R2, via the same `S3_*`
  variables with a different endpoint.
- **Two collections, two policies.** `media` is public and CDN-served. `vault-documents`
  is registered with `signedDownloads` enabled so every fetch goes through a short-lived
  signed URL rather than a public object path. They share a bucket; they do not share a
  policy.
- **Delivery.** Documents are streamed through an authenticated route handler that checks
  role before issuing a short-lived signed URL. A document URL is never rendered into
  HTML, never placed in an RSC payload, and never logged.
- **Separation.** Identity documents live in `vault-documents`, never in `media`. `media`
  is public and CDN-served; the vault is neither.
- **Viewing is an event.** Every document view writes an audit entry naming the viewer,
  the subject, the document type and the time. No exceptions, including for `admin`.
- **Locking.** Documents cannot be edited while verification is `pending_review`.
- **Erasure.** Account deletion nullifies personal data and destroys vault documents.
  Payment records are retained for statutory audit with the personal fields nulled.
- **Indexing.** Phone numbers, ID numbers and document URLs are never exposed to search
  engines. Public profile pages carry no contact data at all, so there is nothing to leak.

---

## Payments

Direct Safaricom Daraja integration in `src/lib/mpesa.ts`. Server-only; never imported
into a client component.

- OAuth token, password and timestamp generation, phone normalization, STK push
  initiation.
- Base URL resolves at call time from `MPESA_ENVIRONMENT` — sandbox and production are
  entirely different hosts.
- The callback endpoint verifies amount, phone number, merchant credentials and
  transaction-ID uniqueness before confirming anything.
- Duplicate callbacks are ignored and logged. A confirmed payment never activates anything
  twice.
- `stk_sent` transitions to `expired` after a timeout, driven by the `payment-timeout`
  task on Payload's job queue.
- Amounts are integer KSh. No floats anywhere in the money path.
- If activation fails after a confirmed payment, the payment stays confirmed, an error
  state is flagged, an admin is alerted and activation is retried. It is never
  double-applied and never silently rolled back.

**There is no payment bypass.** The v1 codebase carried `ENABLE_PAYMENT_BYPASS` and a mock
payment route. Neither exists in this build. Testing against Daraja uses the sandbox
environment.

---

## Background Jobs

Payload's built-in job queue. Configured in `payload.config.ts` with `jobs.autoRun` at
`* * * * *`, limit 10. Task handlers live in `src/jobs/` and are registered in
`jobs.tasks`.

Access to the queue is granted to `admin` and `staff` from the panel, or to an external
scheduler presenting `CRON_SECRET` as a bearer token against `/api/payload-jobs/run`.

| Task                  | Frequency    | Effect                                                                             |
| --------------------- | ------------ | ---------------------------------------------------------------------------------- |
| `verification-expiry` | daily        | `verified` → `verification_expired` past expiry; hide profile; email               |
| `subscription-expiry` | hourly       | `active` → `expired` past expiry; block new reveals; email                         |
| `payment-timeout`     | every minute | `stk_sent` → `expired` past the window                                             |
| `eoi-nudge`           | daily        | hire-confirmation prompt at 7 and 14 days after an accepted expression of interest |

Every task calls a domain service. None writes to the database directly. Every one is
idempotent, writes an audit entry per transition, and must survive running twice against
the same record without double-applying.

The queue runs in-process, so tasks only fire while the application is up. On a
Docker-restart VPS that is acceptable; a task that missed its window catches up on the
next run because every task polls for eligible records rather than relying on having been
woken at the right moment.

---

## Audit Logging and Analytics

Two systems. Never merged, never used for each other's job.

**Audit logs** — operational and compliance record. Immutable, in MongoDB, readable by
`staff` and `admin` in the console. Written through `lib/audit.ts`.

Every one of the following writes an entry: verification transitions, subscription
transitions, payment confirmations and failures, duplicate callbacks, contact reveals,
document views, expressions of interest, hire confirmations, review moderation,
suspensions, reinstatements, deletions, blacklisting, and every admin override — which
additionally requires a reason.

**PostHog** — product analytics. Aggregate, behavioural.

**No personally identifying data ever enters PostHog.** No phone number, no ID number, no
document URL, no email address, no full name, no free-text field a user typed. Events
carry a user identifier and non-identifying properties only. The event list is fixed in
`code-standards.md`; adding an event means adding it there first.

---

## Environment

| Variable                                                                                                                     | Used by                                             |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `DATABASE_URL`                                                                                                               | `payload.config.ts`                                 |
| `PAYLOAD_SECRET`, `PREVIEW_SECRET`, `CRON_SECRET`                                                                            | Payload, preview, job queue                         |
| `NEXT_PUBLIC_SERVER_URL`                                                                                                     | Clerk `authorizedParties`, canonical URLs, sitemaps |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`                                                                      | Clerk. **Both** required by `createClerkClient`.    |
| `CLERK_WEBHOOK_SIGNING_SECRET`                                                                                               | webhook verification                                |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`                                                                                              | `/sign-in`                                          |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`                                                                            | `/post-auth`                                        |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`                                                                            | `/post-auth`                                        |
| `NEXT_PUBLIC_CLERK_TELEMETRY_DISABLED`                                                                                       | `1`                                                 |
| `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_ACCESS_KEY_SECRET`, `S3_REGION`, `S3_ENDPOINT`                                          | storage. Endpoint switches MinIO ↔ R2.              |
| `MPESA_ENVIRONMENT`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL` | `lib/mpesa.ts`                                      |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`                                                                    | email                                               |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`                                                                        | analytics — **to be added**                         |

`.env.example` must list every variable above, with the MinIO and Cloudflare blocks
labelled by environment. It is committed; `.env` never is. `NEXT_PUBLIC_` means the
browser sees it — never prefix a secret.

---

## Invariants

Rules an agent must never violate. If a task appears to require breaking one, stop and
ask.

### Identity

1. `role` is written only by an `admin` in the Payload panel, or by the typed
   `'mjakazi' | 'mwajiri'` allowlist in `/post-auth`. Never from any other path.
2. `unsafeMetadata` is never read as an authorization.
3. Clerk `publicMetadata` is never the sole enforcement mechanism for anything.
4. `role` always carries field-level access. Collection-level update is not sufficient.
5. There is one identity collection. Never reintroduce `accounts`.

### Money

6. No recurring billing primitive is ever created. No auto-renewal, ever.
7. No cash-refund path exists in code.
8. Only a verified M-Pesa callback moves a payment to `confirmed`.
9. A confirmed payment is immutable.
10. A duplicate transaction ID never activates anything twice.
11. All money is integer KSh. No floats in the money path.
12. Prices come from `platform-settings`, never from a literal in application code.
13. No payment bypass, mock route or dev shortcut exists in the codebase.

### Access

14. Contact fields are never returned without an active subscription or an existing
    unlock. Absence from the payload, not masking in the UI.
15. Every Local API read that can reach a profile passes `overrideAccess: false` and the
    authenticated `req`. Exemptions: the Clerk strategy, the Clerk webhook,
    `lib/audit.ts`.
16. Queries touching profiles pass an explicit `select`. Never rely on defaults.
17. A profile is publicly visible only when `verificationState = verified` **and**
    `availabilityStatus = available` **and** not blacklisted **and** not deactivated.
18. `users` is never granted blanket read to `staff`.

### Documents

19. A vault document URL is never rendered, cached, logged, or included in an error
    message, analytics event or client payload.
20. Every document view writes an audit entry. Including for `admin`.
21. Identity documents never live in `media`.

### State

22. No domain state changes without a confirmed payment where one is required.
23. Every state transition writes an audit entry with previous and new state.
24. State transitions are atomic. A partial write is rolled back.
25. Verification and subscription are independent. Neither depends on the other.
26. Background jobs are idempotent.

### Structure

27. Business logic lives in `services/`. Route handlers validate and delegate. Components
    render.
28. `services/` never imports from `components/` and never touches React.
29. Marketing pages never query domain state except through the guarded directory path.
30. No hardcoded hex value or raw Tailwind colour class. Tokens only, per `ui-tokens.md`.
31. No personally identifying data in PostHog.
