# Code Standards

## Purpose

Implementation rules and conventions that apply across the whole project. They
exist to prevent pattern drift: the same kind of problem should always be solved
the same way, regardless of which session writes the code.

Read this before writing any code.

Precedence: `architecture.md` decides *what the shape is*. This file decides
*how the code inside that shape is written*. Its invariants are not overridden
here.

---

## How the Agent Works

**The agent writes code. Michael verifies and commits.** That division is not
negotiable.

- **Never run `git commit`, `git push`, `git checkout`, or any command that
  changes repository state.** Produce the code and explain it. Committing follows
  verification, and verification is human.
- **Never run destructive commands.** No `rm -rf`, no dropping collections, no
  truncating data, no `pnpm install` of something not in `architecture.md`.
- **One task at a time.** Finish it completely before touching the next. A task
  that is 90% done is not done.
- **Scope is sacred.** Build exactly what the current task requires. Do not
  refactor adjacent code, do not add helpful extras, do not fix unrelated things
  you noticed. Mention them instead.
- **Read before assuming.** Check `architecture.md` for the schema, check
  `ui-registry.md` for an existing component, check `payload-types.ts` for the
  real shape. Do not infer a field name.
- **Say when you are unsure.** A flagged uncertainty costs one message. A
  confident wrong answer costs a day.
- **If the same problem survives one corrective prompt, stop.** Do not try a
  third variation. Explain what you have tried and what you think is happening.

Clean and obvious beats clever. Someone reading this in six months, with no
context, should be able to follow it.

---

## TypeScript

- Strict mode. No exceptions, no `// @ts-ignore`, no `// @ts-expect-error`
  without a comment saying why and what would remove it.
- **Never `any`.** Use `unknown` and narrow it.
- **Never `as`** unless it is genuinely unavoidable, and then with a comment
  explaining why. `(user as any).role` is the exact pattern that hid a broken
  access-control layer in v1.
- **Types come from `payload-types.ts`.** Derive rather than redeclare:

  ```typescript
  import type { User, WajakaziProfile } from "@/payload-types";

  type Role = NonNullable<User["role"]>;
  type VerificationState = NonNullable<WajakaziProfile["verificationState"]>;
  ```

  Run `pnpm generate:types` after every schema change. A hand-written parallel
  type will drift, and it will drift silently.
- `type` for object shapes and unions. `interface` only when something needs
  extending.
- Explicit return types on exported functions. Inference is fine internally.
- `const` by default. `let` only where reassignment is real.
- No floating promises. Every async call is awaited or explicitly handled.

---

## Naming and Files

**Every file is kebab-case.** Including components. The export inside is
PascalCase.

```
src/payload/access/access-control.ts          → isAdminOrStaff
src/payload/strategy/clerk-strategy.ts        → clerkStrategy
src/components/admin/clerk-admin-provider.tsx → ClerkAdminProvider
src/components/ui/button.tsx                  → Button
src/payload/utilities/get-current-user.ts     → getCurrentUser
src/services/verification.service.ts          → verification service functions
```

Established shapes, follow them:

| Kind | Path |
|---|---|
| Collection | `payload/collections/{name}/schema.ts` |
| Collection hook | `payload/collections/{name}/hooks/{verb-noun}.ts` |
| Block | `payload/blocks/{name}/{schema.ts, component.tsx, component-client.tsx}` |
| Global | `payload/blocks/globals/{name}/schema.ts` |
| Utility | `payload/utilities/{verb-noun}.ts` |
| Service | `services/{domain}.service.ts` |
| Job task | `jobs/{task-name}.ts` |
| Route handler | `app/(payload)/api/{webhooks\|actions}/{...}/route.ts` |
| Server Action | `app/actions/{domain}.ts` |
| Component | `components/{area}/{name}.tsx` or `{name}/index.tsx` |

Rules:

- Collection slugs are kebab-case and plural: `wajakazi-profiles`,
  `contact-unlocks`, `audit-logs`.
- **Named exports only**, declared at the bottom of the file:
  `export { Users };`. Pages are the sole exception:
  `export { Page as default };`.
- One component per file.
- Barrel files only where they already exist (`payload/collections/index.ts`,
  `payload/blocks/globals/index.ts`). Do not add more.
- Always the `@/` alias. Never a relative import climbing more than one level.

---

## Formatting

Prettier owns it. Tabs, double quotes, semicolons, and import ordering are all
configured in `.prettierrc.json` with `@ianvs/prettier-plugin-sort-imports` and
`prettier-plugin-tailwindcss`.

**Do not hand-order imports and do not hand-align anything.** Run `pnpm format`.
If output disagrees with something written here, the formatter wins and this file
is wrong.

---

## Comments

- Comments explain **why**, never what. If the code needs a comment to say what
  it does, rename something instead.
- Lowercase, sentence-style, above the thing they describe. Match the existing
  files.
- A comment earns its place when it records a decision, a constraint, or a trap:
  *"clerk cannot change a primary email through updateUser, so this is set once at
  creation and locked thereafter."*
- **No TODO comments in delivered code.** If something is unfinished, say so in
  your message so it can be tracked, not buried.

---

## Components

Server Components by default. Add `"use client"` only for `useState`,
`useEffect`, event handlers, browser APIs, or a client-only library.

Never put `"use client"` on a layout unless there is no alternative.

```tsx
"use client"; // only if genuinely needed

import { useState } from "react";

import type { WajakaziProfile } from "@/payload-types";

import { Button } from "@/components/ui/button";

type Props = {
	profile: WajakaziProfile;
	isUnlocked: boolean;
};

const ProfileCard = ({ profile, isUnlocked }: Props) => {
	// state
	// derived values
	// handlers
	// return
};

export { ProfileCard };
```

- Props type declared directly above the component, named `Props`.
- Data fetching happens in Server Components. A Client Component receives data as
  props; it never queries.
- No inline styles. Tokens from `ui-tokens.md`, rules from `ui-rules.md`.
- Register every new component in `ui-registry.md` when it is built.

### Shadcn components are installed, never hand-written

```bash
pnpm dlx shadcn@latest add dialog
```

`components.json` is configured. Anything in `components/ui/` arrives through
that command and is then customized in place if needed. **Never hand-author a
file into `components/ui/`** — a hand-rolled `Dialog` diverges from the real one
in accessibility, keyboard handling and Base UI wiring, and the divergence is
invisible until someone tries to use it properly.

Nine components are already installed. Check before adding: the one you want may
be there.

---

## The Service Layer

**All business logic lives in `src/services/`.** Every state transition, every
rule, every decision about whether something is allowed to happen.

```typescript
type Result<T = void> =
	| { success: true; data: T }
	| { success: false; error: string; code?: string };
```

Every service function:

- returns `Result`, never throws to its caller
- takes an explicit actor (the `User`), never reads the session itself
- writes an audit entry for every state transition it performs
- is idempotent where it can be, and says so where it cannot

```typescript
// services/verification.service.ts

const approveVerification = async (
	payload: Payload,
	actor: User,
	profileId: string,
	notes?: string,
): Promise<Result<WajakaziProfile>> => {
	// guard: role
	// guard: current state permits this transition
	// perform the transition
	// write the audit entry
	// return
};

export { approveVerification };
```

Services never import from `components/`, never touch React, never read
`headers()` or `auth()`. They are given what they need.

---

## Route Handlers

Under `app/(payload)/api/`. Two directories only, per `architecture.md`:
`webhooks/` for third-party callers, `actions/` for ours.

```typescript
// app/(payload)/api/actions/verification/submit/route.ts

const POST = async (req: NextRequest) => {
	try {
		const user = await getCurrentUser();
		if (!user) return json({ success: false, error: "Unauthorised" }, 401);
		if (user.role !== "mjakazi") return json({ success: false, error: "Forbidden" }, 403);

		const parsed = SubmitSchema.safeParse(await req.json());
		if (!parsed.success) return json({ success: false, error: "Invalid request" }, 400);

		const payload = await getPayload({ config });
		const result = await submitForVerification(payload, user, parsed.data);

		return json(result, result.success ? 200 : 409);
	} catch (error) {
		console.error("[api/actions/verification/submit]", error);
		return json({ success: false, error: "Internal server error" }, 500);
	}
};

export { POST };
```

Every handler, in this order: **authenticate, authorize, validate, delegate,
respond.** A handler that contains an `if` about business rules is in the wrong
place.

- Always a try/catch.
- Always `{ success, data?, error? }`. Never raw data.
- Log with the route path as prefix: `[api/actions/verification/submit]`.
- Never return a raw error message to the client. Log the detail, return a
  generic string.
- Webhook handlers return **200 for conditions a retry cannot fix.** A missing
  email or an unassigned role is permanent; retrying it only generates noise.

---

## Server Actions

The default for UI-triggered mutations. In `src/app/actions/`, never defined
inline in a component.

```typescript
"use server";

const updateAvailability = async (status: AvailabilityStatus) => {
	try {
		const user = await getCurrentUser();
		if (!user) return { success: false, error: "Unauthorised" };

		const payload = await getPayload({ config });
		const result = await setAvailability(payload, user, status);

		if (result.success) revalidatePath("/dashboard/mjakazi/opportunities");
		return result;
	} catch (error) {
		console.error("[actions/profile.updateAvailability]", error);
		return { success: false, error: "Could not update availability" };
	}
};

export { updateAvailability };
```

- Never throw. Always return the error.
- Always `revalidatePath` after a mutation that changes rendered data.
- Same shape as route handlers, same discipline.

---

## Validation

Zod at every boundary where data enters the system: route handler bodies, Server
Action arguments, webhook payloads, query parameters that reach a database query.

- Schemas live next to what they validate, exported as
  `{Thing}Schema`.
- `safeParse`, never `parse` — a validation failure is a 400, not a stack trace.
- Never trust a client-supplied role, price, tier, user id, or state value.
  Prices come from `platform-settings`; identity comes from the session.

---

## Payload Access

- **Every access rule lives in `payload/access/access-control.ts`.** Never
  declare one inline in a collection.
- Every Local API call that can reach a profile passes `overrideAccess: false`
  and the authenticated `req`. The named exemptions are the Clerk strategy, the
  Clerk webhook, and `lib/audit.ts` — nothing else.
- Queries touching profiles pass an explicit `select`. Contact fields are never
  selected by default.
- Reading contact fields happens in exactly one place: `contact.service.ts`.

---

## Errors

- Never an empty catch. Log or handle.
- Console output always carries a bracketed context prefix:
  `[services/payment]`, `[jobs/subscription-expiry]`,
  `[api/webhooks/payments/callback]`.
- User-facing messages are plain English and say what to do next. Never expose an
  internal error, a stack trace, an ID, or a database detail.
- **Never log a phone number, an ID number, a document URL, or a full email
  address.** Log the record id instead.

---

## Money, Dates, Phones

- **Money is integer KSh.** No floats, no decimals, no currency library. Amounts
  come from `platform-settings`, never from a literal.
- **Datetimes are stored UTC** and rendered `Africa/Nairobi`. Arithmetic uses
  `date-fns`.
- **Phone numbers are normalized to `254` + nine digits starting `7` or `1`.**
  Never hardcode `2547` — portability means the prefix says nothing about the
  network. Normalize once, at the boundary, in `lib/mpesa.ts`. Full rule in
  `library-docs.md`.

---

## Audit Logging

Every entry is written through `lib/audit.ts`. Never `payload.create` into
`audit-logs` directly.

Required on: every verification transition, every subscription transition, every
payment confirmation and failure, duplicate callbacks, contact reveals, **every
document view**, expressions of interest, hire confirmations, review moderation,
suspensions, reinstatements, deletions, blacklisting, and every admin override.

Each entry carries the actor, the target, the previous state, the new state, and
— for anything an admin or staff member initiated by hand — a reason.

Audit entries are immutable. `create`, `update` and `delete` access on the
collection all return false.

---

## PostHog Events

This is the complete list. **Adding an event means adding it here first.**

| Event | Fires when | Properties |
|---|---|---|
| `registration_started` | role chooser clicked | `role` |
| `registration_completed` | role promoted, profile created | `role` |
| `profile_completed` | mjakazi profile first reaches complete | — |
| `documents_uploaded` | both vault documents present | — |
| `verification_submitted` | submitted for review | — |
| `verification_approved` | staff approves | `daysToVerify` |
| `verification_rejected` | staff rejects | `attempt` |
| `directory_searched` | directory filter applied | `filters`, `resultCount` |
| `profile_viewed` | profile detail opened | `isUnlocked` |
| `plan_selected` | tier chosen | `tier` |
| `payment_initiated` | STK push sent | `paymentType`, `tier` |
| `payment_completed` | callback confirms | `paymentType`, `tier` |
| `payment_failed` | callback rejects or times out | `paymentType`, `reason` |
| `contact_unlocked` | contact revealed | `tierAtUnlock` |
| `interest_sent` | expression of interest batch sent | `count` |
| `interest_responded` | mjakazi accepts or rejects | `response` |
| `hire_confirmed` | either party confirms | `confirmedBy` |
| `review_submitted` | mwajiri submits a review | `rating` |
| `concierge_brief_submitted` | brief completed | — |
| `concierge_shortlist_delivered` | staff delivers | `size`, `daysToDeliver` |

**No personally identifying data, ever.** No phone number, no ID number, no
document URL, no email address, no name, no free text a user typed. An event
carries a user identifier and non-identifying properties. Nothing else.

Audit logs are the operational record. PostHog is product analytics. An action
may warrant one, both, or neither — decide when you build it.

---

## Environment Variables

- Every variable used must be in `.env.example`, with a comment. `.env` is never
  committed.
- `NEXT_PUBLIC_` means the browser sees it. **Never prefix a secret.**
- Read from `process.env` once, at module scope, into a named constant. Never
  scatter `process.env.X` through a function body.
- No key, URL, price or secret is ever hardcoded.

---

## Working With Libraries

Skills are installed for the three libraries this project leans on hardest:
`/shadcn`, `/payload` and `/clerk` (with its family of sub-skills). **Consult the
relevant skill before writing code against that library**, not after something
fails. They carry current APIs and project-shaped patterns; training data does
not.

For anything else, `library-docs.md` holds the project-specific notes and traps.

---

## Dependencies

Before installing anything, check in order: does Shadcn have it, does Payload
have it, does Next have it, is there a five-line native solution.

The permitted set is in `architecture.md`. **Installing anything outside it means
updating that file first, in the same task, with a reason.**

Never install Radix directly — Shadcn 4 uses Base UI. Never install a job
scheduler — Payload's queue is the answer. Never reintroduce a removed package.

---

## Git and Releases

Michael's workflow, documented so the agent understands the context it is writing
into — **not instructions for the agent to execute.**

- Conventional Commits, enforced by `semantic-release` via `.releaserc.json`.
  `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- The agent never commits, never branches, never pushes, never tags.

---

## Definition of Done

A task is done when all of these are true. If any is false, say so rather than
declaring completion.

1. It does what the task said, and nothing the task did not say.
2. `pnpm lint` and `pnpm build` both pass.
3. `pnpm generate:types` has been run if the schema changed.
4. No `any`, no unexplained `as`, no TODO, no commented-out code.
5. Every new state transition writes an audit entry.
6. Every relevant PostHog event fires, and carries no PII.
7. No hardcoded colour, price, URL or secret.
8. New components are registered in `ui-registry.md`.
9. `progress-tracker.md` has an entry.
10. Michael has been told, in plain terms, what to verify manually and how.

Point 10 matters most. There are no automated tests on this project, so the
handover is the test. Say what to click, what should happen, and what would
indicate it is broken.
