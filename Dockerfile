# check=skip=SecretsUsedInArgOrEnv
# syntax=docker.io/docker/dockerfile:1

FROM node:24-alpine AS base

# install dependencies only when needed
FROM base AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

# install dependencies based on pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# cache mount for faster dependency install
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    corepack enable pnpm && pnpm i --frozen-lockfile

# rebuild the source code only when needed
FROM base AS builder

WORKDIR /app

# ARGs for next.js client-side bundling (required)
# these MUST be real values as they are baked into the JS bundle
ARG DATABASE_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SERVER_URL
ARG PAYLOAD_SECRET

ENV DATABASE_URL=$DATABASE_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL
ENV PAYLOAD_SECRET=$PAYLOAD_SECRET

COPY --from=deps /app/node_modules ./node_modules

COPY . .

# disable telemetry during the build
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable pnpm && pnpm run build

# production image, copy all the files and run next
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

# disable telemetry during runtime
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs

RUN adduser --system --uid 1001 nextjs

# remove this line if this folder does not exist
COPY --from=builder /app/public ./public

# set the correct permission for prerender cache
RUN mkdir .next

RUN chown nextjs:nodejs .next

# automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
