# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ
from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before
writing any code. Heed deprecation notices.

## Read Before Anything Else

Read in this exact order once per session, before the first implementation task. Do not
re-read the full list for every subsequent task; re-check only the file whose scope covers
the new work (e.g. re-read `ui-tokens.md` before a new UI component, `build-plan.md`
before a new feature).

1. `context/project-overview.md`
2. `context/architecture.md`
3. `context/ui-tokens.md`
4. `context/ui-rules.md`
5. `context/ui-registry.md`
6. `context/code-standards.md`
7. `context/library-docs.md`
8. `context/build-plan.md`
9. `context/progress-tracker.md`

## Rules That Never Change

- Never use hardcoded hex values or raw Tailwind color classes.
- Update `progress-tracker.md` and `ui-registry.md` after every feature.
- Before using any third-party library: check for an installed skill first — `/shadcn` for
  UI components, `/payload` for CMS work. If no skill covers the library, read
  `context/library-docs.md` for project-specific rules before writing code against it.
- Before using any Next.js API, check `node_modules/next/dist/docs/` for deprecation
  notices if the API isn't already documented in `context/library-docs.md`.
- If the same problem persists after one corrective prompt — stop immediately and run
  `/recover`.

## Available Skills

- `/architect` — Before any complex feature. Think before building.
- `/imprint` — After any new UI component. Capture patterns.
- `/review` — Before demo or when something feels off.
- `/recover` — When something breaks after one failed correction.
- `/remember save` — When a feature spans multiple sessions.
- `/remember restore` — When returning after a multi-session feature.
- `/shadcn` — Before adding, installing, or customizing a UI component. Ensures correct
  APIs and patterns.
- `/payload` — Before touching a Payload collection, field, or config. Enforces project
  conventions.
- `/clerk` — Before any Clerk work. Start here, then branch to the specific skill below.
- `/clerk-setup` — Before wiring Clerk into a new project or framework.
- `/clerk-nextjs-patterns` — Before writing Server Actions, `proxy.ts`, or caching logic
  against Clerk.
- `/clerk-backend-api` — Before calling a Clerk Backend API endpoint.
- `/clerk-webhooks` — Before building database sync, notifications, or integrations.
- `/clerk-orgs` — Before adding team workspaces, RBAC, or verified domains.
- `/clerk-billing` — Before adding pricing tables, plans, per-seat billing, or `has()`
  entitlement checks.
- `/clerk-custom-ui` — Before building custom auth forms, styling, or branding.
- `/clerk-cli` — Before managing users, orgs, apps, env keys, or deploy checks from the
  terminal.
- `/clerk-testing` — Before writing Playwright or Cypress tests against authed routes.
