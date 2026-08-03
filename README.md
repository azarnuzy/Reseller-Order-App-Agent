# Refactor Reseller App

A focused ordering workspace built as a pnpm monorepo. It keeps the template's authenticated Hono API and React platform while preparing the Anvia agent path described in `IMPLEMENTATION_PLAN.md`.

## Workspace

- `apps/api`: Hono, Prisma, PostgreSQL, Better Auth, CORS, and the authenticated profile API.
- `apps/platform`: React, Vite, TanStack Router, login/register/profile flow, and the application shell.
- `packages/agent`: Anvia agent workspace, development harness entry point, and evaluation entry point.
- `packages/api-client`: typed Hono client helpers shared with the platform.
- `packages/config`: validated server, model, internal API, and Langfuse configuration.
- `packages/i18n`: shared frontend internationalization setup.
- `packages/logger`: structured Pino logger helpers.
- `packages/ui`: shared React components and styles.

The ordering schema, seed, deterministic API, agent behavior, evaluations, streaming chat endpoint, and chat UI are added in Tasks 2–6 of the implementation plan.

## Local setup

Requirements: Node.js 22+, pnpm 10.30.3+, and PostgreSQL 16+.

```bash
cp .env.example .env
pnpm install
docker compose -f docker-compose.dev.yaml up -d
pnpm db:generate
pnpm db:deploy
pnpm dev
```

The default development addresses are:

- Platform: `http://localhost:3000`
- API: `http://localhost:8000`
- PostgreSQL: `localhost:15432`

Set a development `BETTER_AUTH_SECRET` before using authentication. Model and Langfuse credentials become necessary when the agent is implemented; all of them are mandatory when `NODE_ENV=production`.

## Commands

```bash
pnpm typecheck       # type-check every workspace package
pnpm build           # production-build API and Platform
pnpm check           # run Biome checks
pnpm db:generate     # generate the Prisma client
pnpm db:deploy       # apply committed migrations
pnpm db:migrate      # create a development migration
pnpm db:seed         # seed the ordering fixtures (Task 2)
pnpm agent:dev       # run the local agent harness
pnpm agent:eval      # run product-level agent evaluations (Task 4)
```

The Task 3 harness opens the order agent in Anvia Studio while its tools talk to the real API with
trusted authentication context. Sign in to the Platform, copy the Better Auth cookie value from
the browser's request headers, then run:

```bash
AGENT_AUTH_COOKIE='better-auth.session_token=...' pnpm agent:dev
```

The harness creates a new owned ordering session automatically and serves the Studio playground at
`http://localhost:4021/playground`. To continue an existing draft, set `AGENT_SESSION_ID`.
`AGENT_AUTHORIZATION` is also supported when the configured authentication path uses an
authorization header. Credentials and the ordering session are bound by the harness and are never
exposed as model tool inputs. Set `RUNNER_PORT` to use a different Studio port.

This project intentionally has no Vitest setup or unit-test scripts. Verification follows the implementation plan: typechecks, production builds, Prisma validation and seed checks, HTTP smoke checks, the agent harness, and the Task 4 evaluation runner.

## Configuration

Copy `.env.example` and configure these groups:

- Database: `DATABASE_URL` and `DOCKER_DATABASE_URL`.
- URLs: `API_URL`, `PLATFORM_URL`, `VITE_API_URL`, `CLIENT_ORIGINS`, and `INTERNAL_AGENT_API_URL`.
- Authentication: `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`.
- Logging: `LOG_LEVEL`.
- Model provider: `MODEL_PROVIDER`, `MODEL_NAME`, `OPENAI_API_KEY`, and optional `OPENAI_BASE_URL`.
- Langfuse: `LANGFUSE_BASE_URL`, `LANGFUSE_PUBLIC_KEY`, and `LANGFUSE_SECRET_KEY`.

Production configuration rejects the template Better Auth secret and requires a secret of at least 32 characters plus the model and Langfuse credentials.

## Containers

For PostgreSQL only during local development:

```bash
docker compose -f docker-compose.dev.yaml up -d
```

For the production-style API, PostgreSQL, and Caddy-served Platform path:

```bash
docker compose up --build
```

Caddy serves the compiled Platform, proxies the API hostname, and is the only public container. The API and PostgreSQL stay on the internal Compose network.

## Project tree

```text
apps/
  api/
    prisma/
    src/modules/auth/
    src/modules/profile/
    src/app.ts
    src/main.ts
    src/prisma.ts
  platform/
    src/modules/app-shell/
    src/modules/auth/
    src/modules/profile/
    src/routes/
packages/
  agent/src/
    prompts/base-instructions.ts
    providers/openai.ts
    tools/{catalog-tools,draft-tools,order-tools,reseller-api-client,tool-schemas}.ts
    agent.ts
    runner-dev.ts
  api-client/
  config/
  i18n/
  logger/
  ui/
```
