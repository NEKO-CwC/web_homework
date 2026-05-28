# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED="1"

RUN corepack enable

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/storefront/package.json apps/storefront/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS builder

ENV DATABASE_URL="postgresql://minimal_mall:minimal_mall@localhost:5432/minimal_mall?schema=public"
ENV AUTH_SESSION_SECRET="docker-build-placeholder"
ENV MALL_WRITE_MODE="demo"

COPY . .

RUN pnpm prisma:generate
RUN pnpm build

FROM base AS runner

ENV NODE_ENV="production"
ENV HOSTNAME="0.0.0.0"
ENV PORT="3000"

COPY --from=builder /app /app

EXPOSE 3000

CMD ["pnpm", "--filter", "@minimal-mall/storefront", "start"]
