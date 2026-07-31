# Payload Template Project

Internal starter template for building customer websites, landing pages, and SaaS
applications on a consistent stack. Bootstrap new projects from this repo instead of
starting from scratch — auth, CMS, storage, and UI conventions are already wired up.

## Stack

- **Framework**: [Next.js](https://nextjs.org) 16 (App Router)
- **CMS**: [Payload CMS](https://payloadcms.com) 3
- **Database**: MongoDB
- **Auth**: [Clerk](https://clerk.com)
- **Storage**: S3-compatible object storage (media uploads)
- **Email**: [Resend](https://resend.com)
- **UI**: Tailwind CSS 4, [shadcn/ui](https://ui.shadcn.com), Lucide icons, Motion

## Requirements

- Node.js `^18.20.2` or `>=20.9.0`
- pnpm `^9`, `^10`, or `^11`
- A MongoDB connection string (local, Docker, or Atlas)

## Setup

1. Clone the repo and install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the environment file and fill in the values:

   ```bash
   cp .env.example .env
   ```

   | Variable | Purpose |
   | --- | --- |
   | `DATABASE_URL` | MongoDB connection string |
   | `PAYLOAD_SECRET` | Payload's signing secret |
   | `PREVIEW_SECRET` | Secret used for live preview links |
   | `CRON_SECRET` | Secret for authenticating scheduled/cron jobs |
   | `NEXT_PUBLIC_SERVER_URL` | Public URL the app is served from |
   | `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk API keys |
   | `CLERK_WEBHOOK_SIGNING_SECRET` | Verifies incoming Clerk webhooks |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `..._SIGN_IN_FALLBACK_REDIRECT_URL`, `..._SIGN_UP_FALLBACK_REDIRECT_URL` | Clerk auth flow routing |
   | `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_ACCESS_KEY_SECRET`, `S3_REGION`, `S3_ENDPOINT` | Media storage (S3-compatible) |
   | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME` | Transactional email |

3. Start the dev server:

   ```bash
   pnpm dev
   ```

4. Open `http://localhost:3000`. Follow the on-screen instructions to log in via
   Clerk and complete first-run setup.

### Docker (optional)

To run MongoDB locally via Docker instead of a standalone instance or Atlas:

1. Set `DATABASE_URL` in `.env` to `mongodb://127.0.0.1/<dbname>`.
2. Match `<dbname>` in `docker-compose.yml`.
3. Run `docker-compose up` (add `-d` to run in the background).

## Available Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Start the Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint |
| `pnpm payload` | Run the Payload CLI |
| `pnpm generate:types` | Regenerate Payload's TypeScript types from the config |
| `pnpm generate:importmap` | Regenerate Payload's admin import map |

Run `pnpm generate:types` after changing any collection, global, or field config so
generated types stay in sync.

## Project Structure

- `src/` — application code (Next.js routes, Payload config, collections, components)
- `context/` — living documentation (architecture, UI tokens/rules, code standards,
  build plan, progress tracker) used to keep new projects built from this template
  consistent
- `docker-compose.yml` — local MongoDB for Docker-based development

## Collections

- **Users** — auth-enabled collection with admin panel access, backed by Clerk.
- **Media** — uploads collection with pre-configured image sizes and focal point
  support, backed by S3-compatible storage.

See the [Payload Collections docs](https://payloadcms.com/docs/configuration/collections)
to extend either.

## Using This as a Starter

When bootstrapping a new internal project from this template:

1. Update `package.json` name/description and this README's title.
2. Review `context/` and update it to describe the new project's purpose, scope, and
   architecture — it should not still describe this template once customized.
3. Keep the Clerk, Payload, S3, and Resend wiring unless the new project has a reason
   to diverge — the point of the template is a consistent baseline across projects.

## Support

Internal questions: ask in the team channel. For upstream framework issues, see the
[Payload Discord](https://discord.com/invite/payload) or
[Payload GitHub discussions](https://github.com/payloadcms/payload/discussions).
