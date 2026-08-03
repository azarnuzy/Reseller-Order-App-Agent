FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apk add --no-cache openssl \
  && corepack enable

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/platform/package.json apps/platform/package.json
COPY packages/agent/package.json packages/agent/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/i18n/package.json packages/i18n/package.json
COPY packages/logger/package.json packages/logger/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS build

ARG VITE_API_URL=http://api.localhost
ENV VITE_API_URL=${VITE_API_URL}

COPY . .

RUN DATABASE_URL="postgresql://postgres:postgres@postgres:5432/reseller_order?schema=public" pnpm db:generate
RUN pnpm build
RUN pnpm --filter @repo/agent typecheck

FROM deps AS app

COPY . .

RUN NODE_ENV=development DATABASE_URL="postgresql://postgres:postgres@postgres:5432/reseller_order?schema=public" pnpm db:generate

ENV NODE_ENV=production

EXPOSE 8000

CMD ["pnpm", "--filter", "@repo/api", "start"]

FROM caddy:2-alpine AS caddy

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/platform/dist /srv/platform
