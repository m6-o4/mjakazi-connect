# Library Docs

## Purpose

Project-specific rules, traps and hard-won corrections for the third-party libraries this
project depends on. Read the relevant entry **before** writing code against a library, not
after something fails.

This file is not a substitute for documentation. It records what the documentation does
not say, what changed recently enough that training data is wrong, and what already cost
this project time once.

---

## Order of Consultation

1. **Is there a skill?** `/shadcn`, `/payload`, `/clerk` and the Clerk sub-skills carry
   current APIs and working patterns. Use them first.
2. **Is there an entry below?** Project-specific rules live here.
3. **Neither?** Research the library's current documentation before writing, then add an
   entry here recording what you learned.

Versions in `architecture.md` are the installed truth. Never assume an API from memory for
anything in this file — several are recent enough that training data is actively
misleading.

---

## Entry Format

### `library-name`

- **Version**: as installed
- **Why we use it**: purpose in this project
- **Traps**: what goes wrong
- **Project rules**: how we use it here

---

# Clerk + Payload Integration

The single most failure-prone part of this codebase. Every item below was found during a
real build, not read in a document.

**The defining symptom: every auth failure looks identical.** `disableLocalStrategy: true`
leaves `/admin/login` with no form on it. A missing publishable key, a rejected
`authorizedParties`, a validation error during provisioning, and an expired session all
produce the same blank Payload logo. **The server console is the only useful signal.**
Check it before theorizing.

### `createClerkClient` needs the publishable key

`authenticateRequest()` requires **both** keys. Passing only `secretKey` throws
"Publishable key is missing" from inside the strategy, which swallows it and returns
`user: null`. Silent, total auth failure.

### `authorizedParties` is not optional

Omitting it leaves the app open to session tokens issued for other origins. Its value must
match the browsing origin exactly. This project pushes both the bare and `www.` variants
because Traefik routes both to the same app — if you change the domain, change both.

When tunnelling through ngrok, `NEXT_PUBLIC_SERVER_URL` must be the ngrok host, not
localhost, or every session is rejected. Free ngrok hosts change on restart, and both the
registered webhook endpoint and the env var must be updated together.

### The password validator must exempt Clerk-originated creates

The strategy provisions records without a password, since the account already exists in
Clerk. A validator keyed only on `operation === "create"` rejects that write and locks out
every new user at first login. **Key on the absence of `clerkId` instead.**

### `required: true` on the password field breaks all updates

The field is stripped before persistence, so the stored value is always empty and every
subsequent save fails validation on a field the admin cannot see. `admin.condition` hides
the field but does **not** exempt it from validation.

### Never default a missing role

There is no neutral role in this project. `publicMetadata.role` absent means the user has
not completed `/post-auth`, not that they are a basic user. The strategy returns
`{ user: null }` and the webhook returns 200 without creating. Defaulting would misfile
them permanently, since `role` is admin-only after creation.

### Payload's unauthorized page cannot log a Clerk user out

Its Log out button clears the `payload-token` cookie, which was never issued. The Clerk
session survives, so the user bounces back to the same screen indefinitely. Redirect
non-staff from the `(payload)` layout instead of letting them reach it.

### Field-level access is the only thing preventing self-promotion

Collection-level `update` does not distinguish fields. The moment a user can edit their
own record, `role` needs its own `access.update`. Same for `accountState`.

### Staff must not get blanket read on `users`

Granting `isAdminOrSelf` a `true` branch for staff hands them every user record. They need
admin-panel entry, not visibility into every employer's account. Staff read what they need
from the domain collections.

### Local API calls bypass access control

`payload.create()` and `payload.find()` default to `overrideAccess: true`. That is why the
strategy and webhook work despite `create: isAdmin`. **It is also the single largest
threat to the contact vault** — see `architecture.md`.

### Deleting a Payload user deletes their Clerk account

Test deletion on a disposable account. Deleting only in Payload is also not enough: the
strategy re-provisions the record on that user's next sign-in.

### Email cannot round-trip

Clerk's `updateUser` does not accept an email change. Changing a primary email means
creating a new address object, marking it primary, verifying, then deleting the old one.
We treat email as immutable after creation and avoid the problem.

### Role shape changes are a lockout risk

Changing the role enum invalidates both Clerk metadata and stored Payload records. If it
ever must change: update the Clerk metadata first, then the code, then clear the
collection through Mongo directly. Deleting through the admin panel would fire
`afterDelete` and remove the Clerk accounts too.

### `AccessArgs<User>` types the document, not the user

Using it as shorthand for typing `req.user` leads to `user as any` throughout. Once
`payload-types.ts` is generated, `req.user` is already typed.

### Collection `admin` access accepts only a boolean

It cannot return a `Where` filter, so an `Access`-typed function is not assignable to it.
It needs its own narrower type — see `BooleanAccess` in `access-control.ts`.

### Webhook sequencing

`user.created` fires before `/post-auth` promotes the role. That event carries no role and
is skipped. See `architecture.md` for the full sequence.

---

# Payload CMS

- **Version**: 3.87.0
- **Why**: collections, admin panel, local API, job queue, marketing CMS

### Traps

**Component paths resolve relative to `payload.config.ts`.** With the config in `src/`, a
`/src/components/...` prefix resolves to `src/src/components/...`. The correct prefix is
`/components/...`. The error surfaces from the generated `importMap.js`, not from the
config.

**Turbopack caches resolution failures.** After any change to component paths or file
deletions, restart cold. A hot reload keeps showing the stale error.

**`(payload)/layout.tsx` is Payload-generated but modified here.** It carries the auth
guard. Commit it, and re-apply the guard after any scaffold regeneration.

**Layouts do not wrap route handlers.** The REST API and webhooks are unaffected by the
`(payload)` layout guard. That is correct — the API is governed by collection access and
the webhook must stay reachable without a session.

**Payload's REST API owns `/api/{collection-slug}`.** Our route handlers share that
namespace. See the API namespacing rules in `architecture.md`.

### Project rules

- Run `pnpm generate:types` after every schema change, and `pnpm generate:importmap` after
  any admin component change.
- Access rules live only in `access-control.ts`.
- Collection slugs kebab-case and plural.

---

# Payload Job Queue

- **Why**: every scheduled task in this project. There is no other scheduler.

Configured in `payload.config.ts` with `jobs.autoRun` at `* * * * *`, limit 10. Handlers
live in `src/jobs/` and register in `jobs.tasks`. External triggering hits
`/api/payload-jobs/run` with `CRON_SECRET` as a bearer token.

### Traps

- **It runs in-process.** Tasks fire only while the app is up. Write every task to poll
  for eligible records rather than assuming it was woken at the right moment — a missed
  window then self-corrects on the next run.
- **`autoRun` every minute means every task must be cheap.** Query on indexed fields,
  bound the result set, exit early when there is nothing to do.
- **Idempotency is mandatory.** A task may run twice against the same record. Guard on
  current state, not on a timestamp.

### Project rules

Tasks call domain services. A task that writes to the database directly is a bug.

---

# `@payloadcms/storage-s3`

- **Version**: 3.87.0
- **Why**: MinIO in development, Cloudflare R2 in production

### Traps

- **`forcePathStyle: true` is required for MinIO.** Without it, requests go to a
  virtual-host style URL that MinIO does not serve.
- **`media` and `vault-documents` need different policies.** `media` is public and
  CDN-served. Identity documents must use `signedDownloads` so every fetch goes through a
  short-lived signed URL. Registering the vault collection the same way as `media` would
  publish national IDs.
- Endpoint and region differ between MinIO and R2. Only `S3_ENDPOINT`, `S3_REGION` and
  credentials change — the code does not.

---

# M-Pesa Daraja

- **Why**: the only payment rail. STK Push, direct integration.
- **Where**: `src/lib/mpesa.ts`, server-only, never imported into a client component.

### Traps

- **Sandbox and production are entirely different hosts.** Resolve the base URL at call
  time from `MPESA_ENVIRONMENT`; never hardcode.
- **Phone number normalization is the most common source of a rejected STK push.** Kenyan
  mobile numbers are `254` followed by nine digits beginning with `7` or `1`. Number
  portability means the prefix no longer identifies a network, so never infer the carrier
  from it and never restrict to `2547`.

Accepted inputs, all normalized to the same stored form:

```
0712345678      →  254712345678
0112345678      →  254112345678
712345678       →  254712345678
+254712345678   →  254712345678
254712345678    →  254712345678
2540712345678   →  254712345678   (leading zero after country code, stripped)
```

Normalize once, at the boundary, in `lib/mpesa.ts`. Validate the result against
`^254[17]\d{8}$` and reject anything else rather than guessing.

- **The callback is the source of truth.** The STK response only confirms the push was
  accepted, not that anyone paid. Never grant access on it.
- **Callbacks can arrive twice.** `mpesaReference` is unique and the idempotency check is
  not optional.
- **Callbacks can never arrive.** A user who ignores the prompt produces silence. The
  `payment-timeout` task exists for this.
- **The callback URL must be publicly reachable.** In development that means a tunnel, and
  the URL registered with Safaricom must match.
- **Validate the amount.** Confirm the paid amount equals the expected amount before
  confirming. Amounts come from `platform-settings`.

### Project rules

Amounts are integer KSh. Every callback payload is stored whole for audit. The full state
machine is in `architecture.md`.

---

# PostHog

- **Why**: product analytics. The only analytics tool.

### Traps

- **Two clients, do not mix them.** `posthog-js` in the browser, `posthog-node` on the
  server. The server client needs `flushAt: 1` and `flushInterval: 0` in a
  serverless-shaped runtime or events are lost when the process ends.
- **`identify` after sign-in, `reset` on sign-out.** Without the reset, the next user on
  that browser inherits the previous person's identity.

### Project rules

**No personally identifying data. Ever.** No phone number, no ID number, no document URL,
no email, no name, no free text a user typed. The complete event list is in
`code-standards.md` — adding an event means editing that list first.

PostHog is not the audit log. Compliance questions are answered from `audit-logs`, never
from analytics.

---

# Next.js 16

Recent enough that training data is wrong about several things.

### Traps

- **`middleware.ts` is now `proxy.ts`**, and runs on the Node runtime rather than Edge.
- **The matcher must include `/__clerk/(.*)`** or Clerk's frontend API requests are not
  handled.
- **There is no root `app/layout.tsx` in this project.** Payload's `RootLayout` renders
  `html` and `body`, so each route group renders its own document.
- **`globals.css` is imported per route group**, never hoisted, or Tailwind preflight
  fights the Payload admin stylesheet.
- **`suppressHydrationWarning` does not cascade.** It is needed on both `html` and `body`.
  Browser extensions inject attributes into `body` before hydration.
- **Caching is uncached by default.** Dynamic code runs at request time unless explicitly
  cached.

### Project rules

Before using any Next.js API not documented here, check for deprecation notices rather
than relying on recall.

---

# Shadcn / Base UI

- **Version**: `shadcn` 4.x on `@base-ui/react` 1.7.x

### Traps

- **Shadcn 4 uses Base UI, not Radix.** Every pre-4 example, tutorial and answer online
  imports `@radix-ui/*`. Those imports will install a second primitives library alongside
  the first. **Never `pnpm add @radix-ui/anything`.**
- Base UI's component APIs differ from Radix. Use the `/shadcn` skill rather than adapting
  a Radix example.

### Project rules

Components arrive via `pnpm dlx shadcn@latest add {name}` and are customized in place.
Nothing is hand-authored into `components/ui/`. Nine are already installed — check before
adding.

---

# Zod

- **Why**: validation at every boundary where data enters the system.

### Project rules

`safeParse`, never `parse` — a validation failure is a 400, not a stack trace. Schemas
live next to what they validate, exported as `{Thing}Schema`. Never trust a
client-supplied role, price, tier, user id or state value.

---

# `react-hook-form`

- **Why**: the Mjakazi profile alone is roughly twenty fields.

### Traps

- Uncontrolled by default. Reading a value during render gives a stale one — use `watch`
  or `getValues`.
- Server Action integration needs the form's `handleSubmit` to call the action, not the
  form's native action attribute, if client-side validation is wanted first.

### Project rules

Zod resolvers via `@hookform/resolvers`. The same schema validates on the client and again
on the server — client validation is a courtesy, server validation is the control.

---

# `date-fns`

- **Why**: expiry arithmetic. No moment, no dayjs.

### Project rules

Datetimes are stored UTC and rendered `Africa/Nairobi`. Subscription stacking appends
duration to the existing expiry rather than to `now()` — see `architecture.md`. Never
compute an expiry with raw millisecond arithmetic.

---

# Resend

- **Version**: via `@payloadcms/email-resend`
- **Why**: all transactional email.

### Traps

- The sending domain must be verified or delivery silently fails.
- `RESEND_FROM_EMAIL` must be on the verified domain.

### Project rules

Email failure never blocks a state transition. Log it and continue — a Mjakazi whose
verification succeeded but whose email bounced is verified, not pending.

---

# semantic-release

- **Why**: versioning and changelog, configured in `.releaserc.json`.

Requires Conventional Commits. **This is Michael's workflow, not the agent's** — the agent
never commits, so this entry is context, not instruction.

---

# Libraries With No Entry Yet

If you use something not listed here and not covered by a skill: research its current
documentation first, write the code, then add an entry recording the traps you hit. The
next session should not have to rediscover them.
