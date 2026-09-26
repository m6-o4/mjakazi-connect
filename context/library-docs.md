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

When tunnelling through Cloudflare, `NEXT_PUBLIC_SERVER_URL` must be the tunnel host, not
localhost, or every session is rejected. Keep the tunnel hostname, the env var and the
registered webhook endpoint in sync whenever they change.

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

### Staff read users, edit SaaS accounts, never read `clerkId`

`users.read` is `isAdminOrStaffOrSelf` so staff see name + email on the accounts screens.
`users.update` is `isAdminOrStaffOrSelfAccountEdit` — staff edit only mjakazi / mwajiri,
never back-office accounts. `clerkId` stays admin-read-only.

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

**`select` takes nested subfields — and a bare `true` on an array publishes every
subfield.** `select: { arrayField: { subfield: true } }` is a supported shape:
`payload-types.ts` generates it, and `getSelectMode` recurses into object-valued entries
rather than stopping at the array. So `select: { rows: true }` returns all subfields, and
any subfield added to the array later is published by default. **A field an
unauthenticated read can reach names its subfields explicitly.** `directory.service.ts`
therefore keeps `DIRECTORY_PUBLIC_FIELDS` for the list reads and `DIRECTORY_DETAIL_FIELDS`
for the detail reads, the latter adding `employmentHistory` by subfield. Corollary: one
`select` object shared by several reads fetches the union, so a field only a detail page
renders is loaded by every list, saved list and count query too.

### Project rules

- Run `pnpm generate:types` after every schema change, and `pnpm generate:importmap` after
  any admin component change.
- Access rules live only in `access-control.ts`.
- Collection slugs kebab-case and plural.
- An array field that bounds user input carries `maxRows`, and the bound is imported from
  a shared constants module so the payload field, the zod schema and the form cannot
  disagree (employment history: `MAX_EMPLOYMENT_ENTRIES` in `profile-constants.ts`).
- **A select `defaultValue` does not backfill existing documents.** Adding `side` to
  `vault-documents` with `defaultValue: "front"` left records written before the field
  without a `side` key. Match them with `{ side: { exists: false } }` (inside an `or`
  alongside the real value) when a query must treat "no side" as the front — otherwise a
  replace misses the legacy record and orphans it. Reads normalize a missing side rather
  than rejecting it.

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
- **A standalone task config must be typed `TaskConfig<any>`.** The plain `TaskConfig`
  constrains `slug` to `TaskType` (`keyof TypedJobs['tasks']`), which is empty before the
  task is registered — annotating a task as `TaskConfig` fails type-checking.
- **`schedule` queues, `autoRun` runs.** A task's `schedule` (cron + `queue`) is what
  places a job in the queue; `autoRun` picks it up. Both use the same cron parser —
  `* * * * *` is every minute.

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
- **Callbacks can never arrive.** A user who ignores the prompt, and a lost delivery, both
  produce silence. The `payment-timeout` task asks M-Pesa about unanswered pushes instead
  of writing them off: a "not paid" verdict has to come from M-Pesa, never from elapsed
  time.
- **The callback URL must be publicly reachable.** In development that means a tunnel, and
  the URL registered with Safaricom must match.
- **Daraja 3.0 omits `Value` on some metadata items.** A paybill success callback includes
  `{ Name: "Balance" }` with no `Value` at all. Parsing must tolerate a missing `Value` or
  the entire callback is dropped — metadata items are coerced, never rejected.
- **Validate the amount.** Confirm the paid amount equals the expected amount before
  confirming. Amounts come from `platform-settings`.
- **Every callback that arrives is recorded before it is judged.** The handler answers 200
  on every path so Daraja never re-sends, which means an arrival we cannot match or read
  would otherwise leave no trace and look identical to one that was never delivered.
  `recordCallbackArrival` writes `payment_callback_received` (with the raw body when it
  could not be parsed) before any matching happens. Never move that write after the
  decisions — it is the only evidence that Daraja posted.
- **`TransactionDesc` is capped at 13 characters and we exceed it.** We send
  `"Mjakazi verification fee"` (24) and `` `Subscription — <tier>` ``, which is longer.
  Daraja still accepts the push today, so it is not the cause of the missing callbacks,
  but it is off-spec and must be shortened before production credentials.
- **A rejected push does not answer with `ResponseCode`.** It answers
  `{ requestId, errorCode, errorMessage }` — see the "Sample error response" in the
  Express docs. Neither field is read today, so a rejection records the generic "M-Pesa
  rejected the request." and the real `errorCode`/`errorMessage` are discarded.
- **Express Query cannot return the receipt.** Confirmed against Safaricom's own
  documentation: the query response is exactly `ResponseCode`, `ResponseDescription`,
  `MerchantRequestID`, `CheckoutRequestID`, `ResultCode`, `ResultDesc`. `ResultCode: 0`
  says the customer paid; there is no `MpesaReceiptNumber`, and there cannot be, because
  the query is about the request we sent to the handset, not the money that moved. The
  receipt exists only in the callback, or in the customer's SMS. The CallBackURL also
  needs no registration or allowlisting — the per-request `CallBackURL` is sufficient.

### Project rules

Amounts are integer KSh. Every callback payload is stored whole for audit. The full state
machine is in `architecture.md`.

**Development uses real callbacks — there is no in-app simulator.** M-Pesa is an
online-only flow, so development settles payments exactly as production does: the tunnel
(`app-dev.s3.co.ke`, already in `allowedDevOrigins`) must be running and reachable, and
the `MPESA_CALLBACK_URL` env must point at it. Post a correctly-matched callback by hand,
or use the staff list below, to settle a payment whose callback goes missing — it sits at
`stk_sent` until the sweep asks M-Pesa what happened, and is never expired on a timer.

**Known gap — the callback goes missing, and delivery is still unproven.** Daraja 3.0 has
taken a KSh 2 sandbox payment and never posted the callback on three occasions
(2026-09-15, 2026-09-16, 2026-09-21). Our push request and callback parsing match the
Express documentation field for field, the endpoint answers 405 to a GET and 200 to a
POST, and the `CallBackURL` needs no registration, so the application is not the suspected
cause. What was missing was the ability to see: every path answered 200 and logged only to
the console, so "Daraja never posted" and "we received it and dropped it" were
indistinguishable. `payment_callback_received` (2026-09-21) closes that — the next lost
confirmation shows its arrival, or its absence.

Recovery no longer depends on knowing which it was. A payment whose callback is missing is
completed from the payer's receipt by staff or admin on `/dashboard/staff/payments`
(`reconcilePayment`), and the sweep asks M-Pesa directly when the two-minute window
passes. Still open: the Cloudflare edge in front of the tunnel has not yet been checked
for POSTs turned away before they reached the app — the leading suspect, because one
payment was lost at 20:38 while another confirmed in twelve seconds at 21:01 on the same
day, same URL, same handset.

**A `select` option addition is a type change.** `audit-logs.action` is a Payload
`select`, so a new audit action must be added to **both** `src/lib/audit.ts` and the
collection's options, then `pnpm generate:types` must run before `pnpm build` will
type-check. A writer whose action is missing from the options is silently rejected at
runtime, which reads as "the feature does nothing".

**The in-process job runner is not reliable enough to assume a run per minute.** Only the
queue's writer determines _what_ is enqueued; only an external scheduler hitting
`/api/payload-jobs/run` with `CRON_SECRET` guarantees _when_. Any sweep that must act
inside a short window has to be written so a missed run self-corrects — that is why the
payment sweep asks about each payment once (tracked by `mpesaStatusCheckedAt`) instead of
depending on cadence.

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

- **Server-side events use the Clerk id as `distinctId`.** The browser identifies with
  Clerk's `user.id`; a server event carrying a Payload object id would create a second,
  disconnected person. Resolve `users.clerkId` before capturing server-side
  (`lib/posthog-server.ts`), falling back to the Payload id when the Clerk id is absent.

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
- **`revalidatePath`/`revalidateTag` throw outside a request context.** Called from a
  Payload background job (the job queue runs outside any request) or a standalone script,
  they throw `Invariant: static generation store missing`. Payload then reports the write
  as failed (`docs: []` + an error in the result) even though the DB write already
  committed. Always wrap revalidation in try/catch inside `afterChange`/`afterDelete`
  hooks, or set `context.disableRevalidate` on the write (see
  `wajakazi-profiles/hooks/revalidate-profile.ts`).
- **Next 16.3 hashes every `outputFileTracingIncludes` entry, and a symlink-to-directory
  crashes the build.** `NftJsonAsset::content` reads and hashes each matched path; on
  Windows that surfaces as `TurbopackInternalError: Access is denied (os error 5)` (EISDIR
  elsewhere) from `FileContent::hash`. pnpm's isolated store makes this easy to hit: a
  glob like `node_modules/@img/**/*` resolves through the hoisted store
  (`.pnpm/node_modules/@img`) and `node_modules/.pnpm/sharp@*/**/*` walks
  `sharp@*/node_modules/@img`, where `colour` and `sharp-win32-x64` are symlinks to
  directories. `outputFileTracingExcludes` does **not** help — the panic happens while
  hashing, before excludes apply. Scope includes to real directories (e.g.
  `node_modules/.pnpm/@img+*/node_modules/@img/*/**/*`) or to extensions, never a bare
  `**/*` over a pnpm store path. Upstream: vercel/next.js#96255, #96626, #97550.

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
- **The toast component is installed but does nothing until `<Toaster>` is mounted.** It
  lived in `components/ui/toast.tsx` unmounted for a while, so `toast.add(...)` was
  silently dropped. It is mounted in `(saas)/layout.tsx` (inside `ThemeProvider`, wrapping
  `<main>`). The `(payload)` and `(auth)` groups do not have it.
- **`ToastDescription` renders a `<p>` by default.** A `<ul>` or other block content
  inside it is invalid HTML and breaks hydration. This project overrides it with
  `render={<div />}` so a description can carry a list.

### Project rules

Components arrive via `pnpm dlx shadcn@latest add {name}` and are customized in place.
Nothing is hand-authored into `components/ui/`. Nine are already installed — check before
adding.

- **Transient action confirmations go through `src/lib/notify.ts`**, not `toast.add`
  directly: `notifySuccess` (5s), `notifyInfo` (8s), `notifyError` (high priority, no
  auto-dismiss). Pass a stable per-entity `id` so repeat actions upsert one toast instead
  of stacking.
- **Persistent state and field-level validation errors stay inline** — M-Pesa
  awaiting/timeout, document badges, contact reveal, Save/Saved toggle, availability
  status, review "hidden" note, and form field errors.
- **A payment confirmation is the one thing that gets both.** The inline
  `PaymentSuccessNotice` is the persistent record; a `notifySuccess` toast is the
  immediate cue on the live transition. Both pay flows do this, each with its own stable
  `id` (`verification-payment-received`, `subscription-payment-received`).
- **An action that changes the profile's state announces it, and refreshes.** A route
  handler or Server Action that moves the profile to another verification state is not
  revalidated by the client, so the acting component must fire a toast and call
  `router.refresh()` in the same tick — otherwise the old state stays on screen. The vault
  upload route therefore returns `reverted` and `DocumentVault` toasts "Document changed"
  (`id: "document-reverted"`) + refreshes, rather than leaving "verified" showing after
  the badge has gone. A state-change toast replaces any success message the same action
  would otherwise produce; two toasts that disagree is worse than none.
- Toasts survive `router.refresh()` / `router.push()` within the dashboard because
  `<Toaster>` lives in the `(saas)` layout.

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
- **`formState.errors` cannot be indexed by a dotted path.** Inside a `useFieldArray` row
  the error is at `errors.rows[0].role`, but `errors["rows.0.role"]` is `undefined`, so
  the usual `Controller` + `formState.errors[name]` pattern renders no message for a
  nested field while the form still refuses to submit. Use
  `useController({ name, control })` and read `fieldState.error` — it resolves for the
  exact path. Prefer an explicit union of the paths a component accepts over `FieldPath`:
  it keeps the value typed as a string and documents where the component may be used.
- Server Action integration needs the form's `handleSubmit` to call the action, not the
  form's native action attribute, if client-side validation is wanted first.

### Project rules

Zod resolvers via `@hookform/resolvers`. The same schema validates on the client and again
on the server — client validation is a courtesy, server validation is the control.

---

# `date-fns`

- **Why**: expiry arithmetic. No moment, no dayjs.

### Project rules

Datetimes are stored UTC and rendered `Africa/Nairobi`. Subscription stacking converts the
unexpired value of the current window into extra days at the new tier's daily rate, and
the new window runs from the moment of purchase — the policy is in `project-overview.md`,
the arithmetic in `subscription.service.ts`. Never compute an expiry with raw millisecond
arithmetic.

A date-only field round-trips as UTC midnight, so pin the timezone whenever one is
formatted (`timeZone: "Africa/Nairobi"`), or the runtime's own timezone decides which day
is shown — a server behind UTC renders the previous one. Full rule in `code-standards.md`.

---

# Resend

- **Version**: via `@payloadcms/email-resend`
- **Why**: all transactional email.

### Traps

- The sending domain must be verified or delivery silently fails.
- `RESEND_FROM_EMAIL` must be on the verified domain.
- `payload.sendEmail` throws on failure — the adapter wraps a non-2xx as an `APIError`
  rather than returning an error object, so wrap the send in try/catch and log instead of
  inspecting the return value.

### Project rules

Email failure never blocks a state transition. Log it and continue — a Mjakazi whose
verification succeeded but whose email bounced is verified, not pending.

---

# semantic-release

- **Why**: versioning and changelog, configured in `.releaserc.json`.

Requires Conventional Commits. **This is Michael's workflow, not the agent's** — the agent
never commits, so this entry is context, not instruction.

---

# pnpm

- **Version**: 12.6.0 locally; `engines.pnpm` requires `>=10.26.0`
- **Why**: the only package manager. `node-linker=hoisted` in `.npmrc` was the project
  intent, but pnpm ≥11 reads **only auth and registry settings** from `.npmrc`; every
  other setting lives in `pnpm-workspace.yaml` (or the global
  `~/.config/pnpm/config.yaml`). The `.npmrc` was deleted — its `node-linker`,
  `legacy-peer-deps` and `supported-architectures` entries were silently inert, and the
  Dockerfile never copies `.npmrc` anyway.
- **Project rules**:
  - The install uses pnpm's default **isolated** linker, matching what the Docker `deps`
    stage produces on `node:24-alpine`. Do not add `nodeLinker` to `pnpm-workspace.yaml`
    without also re-tuning `outputFileTracingIncludes` — hoisted puts `sharp`/`@img` at
    the top level instead of under `.pnpm/`, so the current store-path globs would match
    nothing.
  - `allowBuilds` needs pnpm ≥10.26; `minimumReleaseAgeExclude` needs ≥10.16. These are
    the reason `engines.pnpm` is `>=10.26.0`.
  - The Docker `deps` stage runs `corepack enable pnpm` with no `packageManager` field, so
    it resolves whatever pnpm corepack defaults to. If the image ever fails on the build
    scripts `allowBuilds` approves, add `"packageManager": "pnpm@12.6.0"` to pin it.
- **Traps**:
  - ESLint and Prettier do not read `.git/info/exclude`, so `.kilo/worktrees/` (excluded
    there) is still traversed by both. It is listed explicitly in `eslint.config.mjs` and
    `.prettierignore`; `pnpm format` would otherwise rewrite an entire worktree clone.

---

# Libraries With No Entry Yet

If you use something not listed here and not covered by a skill: research its current
documentation first, write the code, then add an entry recording the traps you hit. The
next session should not have to rediscover them.

---

# React 19

### Traps

- **Never run a side effect inside a `setState` updater.** React double-invokes updaters
  in development to surface impurity, so a `posthog.capture(...)` or a toast fired from
  inside `setDocs((prev) => { … })` fires twice. Do the state merge in the updater and
  detect the resulting condition in a `useEffect` keyed on the state. Found here in
  `DocumentVault`: the `documents_uploaded` PostHog event was firing twice on the third
  document upload before the check moved into an effect.
