# Refactor Reseller App

A focused ordering workspace built as a pnpm monorepo. It uses one shared anonymous profile so visitors can open the platform and agent without signing in.

## Workspace

- `apps/api`: Hono, Prisma, PostgreSQL, CORS, and the anonymous profile/order API.
- `apps/platform`: React, Vite, TanStack Router, guest profile flow, and the application shell.
- `packages/agent`: Anvia agent workspace, development harness entry point, and evaluation entry point.
- `packages/api-client`: typed Hono client helpers shared with the platform.
- `packages/config`: validated server, model, internal API, and Langfuse configuration.
- `packages/i18n`: shared frontend internationalization setup.
- `packages/logger`: structured Pino logger helpers.
- `packages/ui`: shared React components and styles.

The ordering schema, seed, deterministic API, agent behavior, Langfuse tracing, agent evaluations,
Prisma chat memory, and JSONL streaming chat API are implemented through Task 5. The focused chat UI
follows in Task 6.

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

No login, registration, cookie, or authentication secret is required. Model and Langfuse credentials are mandatory when `NODE_ENV=production`.

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

The agent harness opens the order agent in Anvia Studio while its tools talk to the real API. Keep
the API running, then start Studio with:

```bash
pnpm agent:dev
```

The harness creates a new ordering session under the shared anonymous user and serves the Studio
playground at `http://localhost:4021/playground`. To continue an existing draft, set
`AGENT_SESSION_ID`. Set `RUNNER_PORT` to use a different Studio port.

This project intentionally has no Vitest setup or unit-test scripts. Verification follows the implementation plan: typechecks, production builds, Prisma validation and seed checks, HTTP smoke checks, the agent harness, and the Task 4 evaluation runner.

## Configuration

Copy `.env.example` and configure these groups:

- Database: `DATABASE_URL` and `DOCKER_DATABASE_URL`.
- URLs: `API_URL`, `PLATFORM_URL`, `VITE_API_URL`, `CLIENT_ORIGINS`, and `INTERNAL_AGENT_API_URL`.
- Logging: `LOG_LEVEL`.
- Model provider: `MODEL_PROVIDER`, `MODEL_NAME`, `OPENAI_API_KEY`, and optional `OPENAI_BASE_URL`.
- Langfuse: `LANGFUSE_BASE_URL`, `LANGFUSE_PUBLIC_KEY`, and `LANGFUSE_SECRET_KEY`.
- Agent release: `AGENT_RELEASE`, used to correlate traces with a deployed revision.

Production configuration requires the model and Langfuse credentials.

## Langfuse tracing and evaluations

Every agent run is observed through `@anvia/langfuse`. Conversation traces carry the trusted
anonymous user ID, chat session ID, environment, model, and release. Evaluation traces additionally
carry `evaluationRunId`, `evaluationCaseId`, and the step number. Input and output redaction is
enabled before observations leave the process, and neither trace metadata nor evaluation artifacts
contain configuration secrets or the excluded fixture PII.

To inspect a Studio conversation:

1. Configure the three `LANGFUSE_*` values and `AGENT_RELEASE` in `.env`.
2. Keep the seeded API running and start `pnpm agent:dev`.
3. Send a message in Studio, open the Langfuse Traces view, and filter metadata by the ordering
   session ID printed by the harness. The trace contains the model generations and each typed tool
   call beneath the root agent run.

To run and inspect the behavior suite:

```bash
pnpm agent:eval
# optional focused run
EVAL_CASES=out-of-stock-alternatives,duplicate-title-requires-clarification pnpm agent:eval
```

The API must be running against freshly seeded data, and OpenAI plus Langfuse credentials are
required. The command runs the 16 cases in `packages/agent/src/evals/cases.json`, publishes two
pass/fail scores per case, flushes tracing, and exits non-zero for behavior failures, invalid cases,
or score-reporting errors. Filter Langfuse trace metadata by the `evaluationRunId` printed in the
local JSONL artifact, then open a case trace to inspect its output and tool chain. Local
machine-readable results are written under `artifacts/evals/` by default; set `EVAL_OUTPUT_PATH` to
choose another path.

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
    src/anonymous-user.ts
    src/modules/chat/
    src/modules/chat-sessions/
    src/modules/drafts/
    src/modules/orders/
    src/modules/products/
    src/modules/profile/
    src/modules/storefront/
    src/app.ts
    src/main.ts
    src/prisma.ts
  platform/
    src/modules/app-shell/
    src/modules/profile/
    src/routes/
packages/
  agent/src/
    evals/{cases.json,run.ts}
    observability/tracing.ts
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
