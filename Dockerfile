# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
# postinstall runs "prisma generate", but the schema is not copied yet.
RUN npm ci --ignore-scripts

FROM base AS builder
# NEXT_PUBLIC_* values are inlined into the client bundle at build time.
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL:-https://www.hivhestin.com} \
    NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-https://www.hivhestin.com} \
    NODE_ENV=production \
    VERCEL="" \
    DATABASE_URL=${DATABASE_URL:-"postgresql://postgres:postgres@localhost:5432/postgres"}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build:next

FROM base AS runner
ENV NODE_ENV=production \
    PORT=8080 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Email templates are read with fs at runtime (process.cwd()/src/emails).
COPY --from=builder --chown=nextjs:nodejs /app/src/emails ./src/emails
# Prisma generated client + query engine.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

USER nextjs
EXPOSE 8080

CMD ["node", "server.js"]
