# Refactor App Implementation Plan

## Goal

Build a small ordering product inside `refactor-reseller-app` by following the coding style of the existing template and the learning path through `fsagent/day11-lesson.txt`.

The finished product will let a visitor chat with an AI agent without signing in, browse seeded products, check quantity rules, explicitly confirm an order, and return later to the same conversation. The implementation will use Anvia for the agent runtime, typed tools, Langfuse tracing, Prisma memory, the streaming chat API, and the React chat client.

This is a focused rewrite, not a port of the full `reseller-order-app`.

## Learning scope

| Lesson | Applied material |
| --- | --- |
| Day 5 | Hono REST API, HTTP methods, module-driven backend structure |
| Day 6 | PostgreSQL, Prisma schema, migrations, client, and seed |
| Day 7 | React/Vite presentation layer and TanStack Router |
| Day 8 | pnpm workspace with `apps/*` and `packages/*` |
| Day 9 | Agent loop, instructions, typed tools, and runtime policies |
| Day 10 | Anvia memory, logger/observer concepts, tools, and local harness/Studio validation |
| Day 11 | Agent-first workflow: build, run in a CLI harness, evaluate, iterate, then connect the API and frontend; Langfuse observability |

Day 12 material is excluded: no OCR, document ingestion, embeddings, RAG, Qdrant, or vector database.

## Source material

- Destination/template: `refactor-reseller-app`
- Small Anvia reference: `fsagent/package/agent`, `fsagent/apps/api/src/modules/chat`, and `fsagent/apps/platform`
- Seed fixtures:
  - `reseller-order-app/packages/database/src/seed/__tests__/fixtures/dummyjson/products.json`
  - `reseller-order-app/packages/database/src/seed/__tests__/fixtures/dummyjson/users.json`
  - `reseller-order-app/packages/database/src/seed/__tests__/fixtures/dummyjson/carts.json`
- Official Anvia documentation:
  - Runtime path: <https://anvia.dev/docs/>
  - Tools: <https://anvia.dev/docs/basics/add-tools/>
  - Prisma memory: <https://anvia.dev/docs/basics/add-memory/>
  - Server streams: <https://anvia.dev/docs/basics/server-streams/>
  - React client: <https://anvia.dev/docs/basics/react-client/>

The official Anvia path matches Day 11: verify the model, build the agent, add narrow tools and memory, expose an event stream, and consume it from React.

## Scope boundaries

### Included

- A product catalog API backed by PostgreSQL.
- An idempotent Prisma seed based on the three requested JSON fixtures.
- A small ordering API that validates stock and minimum order quantity.
- One order agent built with Anvia.
- A CLI/harness for validating the agent before app integration.
- Langfuse tracing and a small repeatable agent evaluation suite.
- Persistent chat memory with Anvia Prisma memory.
- A JSONL streaming chat API with Anvia Server.
- One focused chat frontend with product/order results.
- Typecheck, build, manual smoke checks, and agent evaluations for the critical order flow.

### Explicitly excluded

- Copying the old domain, contracts, deterministic router, draft engine, confirmation grants, storefront, admin workflow, queues, document processing, RAG, or custom event protocol.
- Multiple stores, payments, shipping providers, inventory reservations, refunds, and production checkout.
- A second agent or agent delegation.
- A broad ecommerce dashboard.
- Unit/integration/UI test files or Vitest setup.

## No test-file rule

- Do not create `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx` files.
- Remove the template's existing test files, `test` scripts, Vitest configuration, and unused Vitest dependency during Task 1.
- Verify implementation with typecheck, production build, Prisma validation/seed verification, manual HTTP smoke commands, the CLI harness, and the required Task 4 agent evaluation runner.
- The Task 4 evaluation runner and its dataset are product-level AI evaluations required by this project; they are not Vitest/unit-test files.

## Cleanup and target file structure

Task 1 starts by removing template features that are unrelated to this focused application.

### Remove from the template

- Entire `apps/admin` app.
- Entire `packages/worker`, `packages/storage`, and `packages/telemetry` packages.
- `apps/api/src/modules/users`, because it exists for the removed admin user-management screen.
- `scripts/createsuperuser.ts` and its root script.
- Redis, worker, admin-site, S3, and generic OTLP telemetry services/configuration from Docker, Caddy, environment, and package files.
- Existing `*.test.ts` and `*.test.tsx` files plus all Vitest scripts/dependencies.
- Placeholder dashboard content that will be replaced by the chat experience.
- Imports, exports, environment fields, workspace references, and lockfile entries that become unused after this cleanup.

### Keep from the template

- `apps/api` with Hono, Prisma, CORS, a shared anonymous user, and the profile route.
- `apps/platform` with React, Vite, TanStack Router, guest profile flow, and the application shell.
- `packages/api-client`, `packages/config`, `packages/i18n`, `packages/logger`, and `packages/ui`.
- PostgreSQL and the API/platform Docker path.

### Target structure

Use feature names for folders and singular responsibility names for files. Do not introduce generic `helpers.ts`, `common.ts`, or a broad `services.ts` dumping ground.

```text
refactor-reseller-app/
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── seed.ts
│   │   │   └── seed-data/
│   │   │       ├── carts.json
│   │   │       ├── products.json
│   │   │       └── users.json
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── profile/
│   │       │   ├── storefront/
│   │       │   ├── products/
│   │       │   ├── chat-sessions/
│   │       │   ├── drafts/
│   │       │   ├── orders/
│   │       │   └── chat/
│   │       ├── anonymous-user.ts
│   │       ├── app.ts
│   │       ├── main.ts
│   │       └── prisma.ts
│   └── platform/
│       └── src/
│           ├── modules/
│           │   ├── app-shell/
│           │   ├── profile/
│           │   └── order-chat/
│           │       ├── components/
│           │       ├── order-chat-api.ts
│           │       ├── order-chat-page.tsx
│           │       ├── use-order-chat.ts
│           │       └── order-chat-types.ts
│           └── routes/
├── packages/
│   ├── agent/
│   │   └── src/
│   │       ├── evals/
│   │       ├── observability/
│   │       ├── prompts/
│   │       ├── providers/
│   │       ├── tools/
│   │       │   ├── catalog-tools.ts
│   │       │   ├── draft-tools.ts
│   │       │   ├── order-tools.ts
│   │       │   ├── reseller-api-client.ts
│   │       │   └── tool-schemas.ts
│   │       ├── agent.ts
│   │       ├── index.ts
│   │       └── runner-dev.ts
│   ├── api-client/
│   ├── config/
│   ├── i18n/
│   ├── logger/
│   └── ui/
├── docker-compose.dev.yaml
├── docker-compose.yaml
├── package.json
└── pnpm-workspace.yaml
```

Inside an API feature folder, use only files that the feature needs:

- `router.ts`: Hono transport and status codes.
- `schema.ts`: Zod request/query/response schemas.
- `service.ts`: feature business operations.
- `types.ts`: shared feature types only when inference is insufficient.
- A specifically named file such as `order-calculator.ts` or `confirmation-grant.ts` when logic has a distinct responsibility.

## Simple target architecture

```text
apps/platform (React + @anvia/react)
          |
          | JSONL chat stream
          v
apps/api (Hono)
  |-- chat module -> @repo/agent -> Anvia agent + Prisma memory + Langfuse
  |                         |
  |                         | typed HTTP tools
  |                         v
  |-- products module -> Prisma/PostgreSQL
  |-- drafts module   -> Prisma/PostgreSQL
  `-- orders module   -> Prisma transaction

packages/agent
  |-- model + instructions
  |-- product/order API tools
  |-- Langfuse tracing
  |-- CLI harness
  `-- evaluation cases
```

The agent tools call the product/order HTTP API. The server binds the internal API base URL, shared anonymous user, and chat session; the model cannot choose a base URL or user ID.

## Proposed data model

Keep the legacy session/account/verification tables to preserve existing data, but remove their runtime authentication usage. Keep `User` as the stable relation target for one server-provisioned anonymous profile, then add only the transactional models required by the existing flow:

- `Category`: derived from the product fixtures.
- `Product`: catalog, price, discount, stock, MOQ, orderable status, rating, and image fields.
- `StoreProfile`: one simple active profile for currency and order/shipping policy.
- `Customer`: safe customer/shipping profile imported from `users.json` and linked to the anonymous user by server logic.
- `ChatSession`: conversation/order scope associated with the shared anonymous user.
- `DraftOrder`: one active draft per chat session, current totals, customer snapshot, status, and optimistic version.
- `DraftOrderItem`: current product/price/discount/quantity snapshot for the draft.
- `ConfirmationGrant`: short-lived, server-only permission bound to one exact draft version.
- `Order`: confirmed order, official order number, owner/customer snapshot, status, totals, and source.
- `OrderItem`: immutable confirmed product/price/discount/quantity snapshot.
- `IdempotencyRecord`: makes a confirmation retry return the original order instead of creating a duplicate.
- Anvia-generated `AgentMemorySession`, `AgentMemoryMessage`, and `AgentMemoryError` models.

Do not add the old app's `StockMovement`, `OrderStatusHistory`, custom `AgentMemory`, or duplicate `ChatMessage` tables in the first version. Stock is decremented in the confirmation transaction, and Anvia Prisma memory is the single conversation-history store.

Fixture mapping rules:

- Preserve DummyJSON IDs in a `sourceId` field so the seed can safely upsert.
- Seed all five product fixture rows, including the out-of-stock, MOQ, and duplicate-title cases.
- Seed the one user as a `Customer`, using only name, email, phone, address, and image.
- Do not persist the fixture password, card/bank data, crypto wallet, IP, MAC address, SSN, EIN, or user agent. They are unnecessary for ordering and unsafe for logs/evaluations.
- Convert the three carts into historical `Order` and `OrderItem` snapshots. Historical carts do not change current inventory.
- Derive categories and product orderability from the product fixture data.
- Seed a small static `StoreProfile` because no store fixture was requested.
- Calculate new order totals on the server from current product records; never trust totals supplied by the browser or model.

## Order flow

The audit of `reseller-order-app` shows that a real order needs a persistent draft. The refactor will keep that behavior with a smaller implementation:

1. Create or restore an anonymous chat session.
2. Browse, search, sort, or recommend products using current catalog data.
3. Resolve one exact product. If a name matches multiple products, ask the customer to clarify.
4. Ask for quantity when missing and check current stock, orderability, and MOQ.
5. Add the verified product to an active draft; the first add automatically creates the draft.
6. Let the customer review, update quantity, remove an item, or cancel the draft.
7. Collect required recipient data: name, WhatsApp, and complete address. Email and note are optional.
8. Validate every draft item and the customer data again.
9. Generate an authoritative summary from the exact current draft version and prepare a short-lived server-side confirmation grant.
10. Require explicit confirmation such as “confirm” or “yes, order it.” A vague acknowledgement is not sufficient.
11. Revalidate catalog data inside a Prisma transaction, decrement stock, consume the confirmation grant, convert the draft, and create the order idempotently.
12. Return the official order number, status, and totals. A later lookup is restricted to the session owner.

No order is created during browsing, recommendation, draft mutation, ambiguous replies, or before explicit confirmation. Conversation memory helps resolve references, but it is never the source of truth for price, stock, draft contents, customer data, or order state.

## API contract

The original app has separate catalog, draft, order, session, and chat capabilities. Because the refactored agent tools must call HTTP endpoints, the focused API needs the following endpoints.

### Store and catalog endpoints

| Method and path | Used by | Important behavior |
| --- | --- | --- |
| `GET /api/storefront` | `getStoreProfile` | Return store name, currency, locale, and concise order/shipping policy. |
| `GET /api/products` | `searchProducts` | Support `q`, `category`, `minPrice`, `maxPrice`, `inStock`, `orderable`, `sort`, `cursor`, and `limit`. Exact duplicate titles remain separate results. |
| `GET /api/products/:productId` | `getProductDetail` | Return the latest customer-safe product detail or `PRODUCT_NOT_FOUND`. |
| `GET /api/products/:productId/availability` | `checkProductAvailability` | Accept optional `quantity`; return `AVAILABLE`, `OUT_OF_STOCK`, `BELOW_MINIMUM_ORDER`, or `INSUFFICIENT_STOCK`. |
| `GET /api/product-recommendations` | `recommendProducts` | Filter by category, tags, maximum price, excluded product IDs, and limit. Used after an out-of-stock result. |
| `GET /api/product-rankings` | `getTopProducts` | Rank by `BEST_SELLING`, `MOST_POPULAR`, or `HIGHEST_RATED`; the seeded historical carts support sales ranking. |
| `GET /api/categories` | `listCategories` | Return derived category names and product counts. |

### Chat-session endpoints

| Method and path | Consumer | Important behavior |
| --- | --- | --- |
| `POST /api/chat/sessions` | Frontend | Create a chat/order session under the shared anonymous user. |
| `GET /api/chat/sessions/:sessionId/messages` | Frontend | Load Anvia memory only after checking session ownership. |
| `POST /api/chat/sessions/:sessionId/messages` | Frontend | Validate the latest user message, run the agent, and stream Anvia JSONL events. |

No login, cookie, or bearer token is required. Every `ChatSession`, draft, order, and memory read uses the server-controlled anonymous user ID and remains bound to its chat session.

### Draft and customer endpoints used by order tools

| Method and path | Used by | Important behavior |
| --- | --- | --- |
| `GET /api/chat/sessions/:sessionId/draft` | `getActiveDraft` and frontend hydration | Return the active draft or `null`; no active draft is a normal state. |
| `POST /api/chat/sessions/:sessionId/draft/items` | `addDraftItem` | Auto-create the active draft, validate product/quantity, snapshot trusted prices, and recalculate totals. |
| `PATCH /api/chat/sessions/:sessionId/draft/items/:itemId` | `updateDraftItem` | Validate the new exact quantity and recalculate totals. |
| `DELETE /api/chat/sessions/:sessionId/draft/items/:itemId` | `removeDraftItem` | Remove exactly one owned draft item and recalculate totals. |
| `PUT /api/chat/sessions/:sessionId/draft/customer` | `saveCustomerData` | Validate and save name, normalized WhatsApp, complete address, optional email, and note. |
| `GET /api/chat/sessions/:sessionId/customer/latest` | `getLatestCustomerData` | Read the customer snapshot from the latest confirmed order in this same owned session. |
| `POST /api/chat/sessions/:sessionId/draft/validate` | `validateDraft` | Recheck item existence, stock, orderability, MOQ, quantity, and required customer fields. Return structured issues. |
| `POST /api/chat/sessions/:sessionId/draft/summary` | `getOrderSummary` | Revalidate, return authoritative totals/customer data, and create a hidden confirmation grant for this exact draft version. |
| `DELETE /api/chat/sessions/:sessionId/draft` | `cancelDraft` | Cancel only the current owned mutable draft. |

There is intentionally no separate `POST /draft` tool endpoint. `addDraftItem` creates a draft automatically, so the customer and model do not need to manage this implementation detail.

### Confirmed-order endpoints used by order tools

| Method and path | Used by | Important behavior |
| --- | --- | --- |
| `POST /api/chat/sessions/:sessionId/orders` | `confirmOrder` | Accept only the summarized `draftVersion`; resolve the hidden grant and stable idempotency key on the server; revalidate and create atomically. |
| `GET /api/chat/sessions/:sessionId/orders/:orderNumber` | `getOrder` | Look up by public order number and return `ORDER_NOT_FOUND` when it is not owned by the current user/session. |

The model never receives or supplies session ownership, prices, confirmation tokens, grant IDs, idempotency keys, or user IDs. The trusted tool client binds the chat session context before making each request.

### Endpoint inventory result

The focused refactor therefore has:

- 18 tool-facing endpoints: 7 catalog/store, 9 draft/customer, and 2 confirmed-order endpoints.
- 3 frontend chat-session endpoints: create session, load messages, and stream a message.
- 21 new application endpoints in total, excluding the health and guest-profile endpoints.

This keeps the important functionality of the old flow while simplifying it in three places:

- no model-visible `createDraft`; adding the first item creates it;
- no access-token system because the app intentionally uses one shared anonymous identity;
- no raw HTTP confirmation token in the model/frontend path; the server binds a hidden grant to the summarized draft version.

## Agent tools

Keep the original camelCase tool names so the lesson code and evaluation behavior are easy to compare:

- Catalog: `getStoreProfile`, `searchProducts`, `getProductDetail`, `checkProductAvailability`, `recommendProducts`, `getTopProducts`, `listCategories`.
- Draft/customer: `getActiveDraft`, `addDraftItem`, `updateDraftItem`, `removeDraftItem`, `saveCustomerData`, `getLatestCustomerData`, `validateDraft`, `getOrderSummary`, `cancelDraft`.
- Confirmed order: `confirmOrder`, `getOrder`.

All 18 tools use Zod input/output schemas and call the API endpoints above. The API remains the source of truth and returns customer-safe data plus stable error codes.

### Required tool chains by customer intent

| Customer intent or condition | Required tool flow |
| --- | --- |
| General store-policy question | `getStoreProfile` |
| Browse/search products | `searchProducts`; retry with up to two different relevant queries only when successful results are empty |
| Cheapest/most expensive | `searchProducts` with price sort, not sorting words inside the search query |
| Selected product price and stock | `getProductDetail` -> `checkProductAvailability` with the same product ID and exact quantity |
| Category and budget already known | `recommendProducts` |
| Selected product out of stock | `checkProductAvailability` -> `recommendProducts`, excluding that product |
| Top-selling/popular/rated products | `getTopProducts` |
| Ask for available categories | `listCategories` |
| Ask about color/size/variant | `getProductDetail`, then explain that variants are not modeled |
| Add a product | `checkProductAvailability` -> `addDraftItem`; do not add when out of stock |
| MOQ or quantity exceeds stock | `checkProductAvailability` -> `addDraftItem` with the unchanged quantity so the mutation endpoint returns the authoritative rule error |
| Review or continue an order | `getActiveDraft` |
| Change quantity | `getActiveDraft` -> `updateDraftItem` |
| Remove an item | `getActiveDraft` -> `removeDraftItem` |
| Continue with incomplete customer data | `getActiveDraft` -> `validateDraft`; ask only for missing fields |
| Save recipient/shipping data | `saveCustomerData` after validation/normalization in conversation |
| Reuse last recipient | `getLatestCustomerData` -> user approval -> `saveCustomerData` |
| Prepare final review | `validateDraft` -> `getOrderSummary` |
| Ambiguous acknowledgement | `getActiveDraft`; do not call `confirmOrder` |
| Explicit confirmation of latest summary | `confirmOrder` with the exact summarized draft version |
| Expired grant or draft-version conflict | `getOrderSummary` again -> show refreshed summary -> request fresh confirmation |
| Timeout after confirmation request | Retry `confirmOrder` with the same draft version; server idempotency returns the same order |
| Cancel current order | `getActiveDraft` -> `cancelDraft` |
| Public order-number lookup | `getOrder`; trusted ownership decides whether it is accessible |
| Prompt asks to invent/bypass catalog facts | Ignore bypass and call the applicable catalog tool |

Important stable errors include `PRODUCT_NOT_FOUND`, `PRODUCT_OUT_OF_STOCK`, `PRODUCT_NOT_ORDERABLE`, `MINIMUM_ORDER_NOT_MET`, `INSUFFICIENT_STOCK`, `DRAFT_NOT_FOUND`, `DRAFT_VERSION_CONFLICT`, `CUSTOMER_DATA_INCOMPLETE`, `CONFIRMATION_REQUIRED`, `IDEMPOTENCY_CONFLICT`, `ORDER_NOT_FOUND`, and `INTERNAL_ERROR`.

## Six implementation tasks

### Task 1 — Clean up and prepare the project structure

Deliverables:

- Inventory current imports and package references before deleting anything.
- Remove the unused apps, packages, modules, services, test files, scripts, and configuration listed in “Cleanup and target file structure.”
- Simplify Docker Compose to API, Platform, PostgreSQL, and optional Caddy only; remove Redis because this refactor has no queue/worker.
- Simplify `.env.example` and `packages/config` so they contain only database, API/platform URL, logger, model/provider, internal agent API, and Langfuse settings.
- Rename template metadata from `monorepo-template` to the app naming used by the workspace.
- Restructure `apps/api` and `apps/platform` to match the target feature structure without leaving forwarding files or duplicate old/new modules.
- Add `packages/agent` using the target structure and the simple style from `fsagent/package/agent`.
- Add only the required Anvia packages:
  - Agent: `@anvia/core`, one provider adapter such as `@anvia/openai`, and `@anvia/langfuse`.
  - API: `@anvia/server` and `@anvia/memory-prisma`.
  - Platform: `@anvia/react` and `@anvia/react-ui`.
- Add validated environment variables for the model/provider, internal API URL, and Langfuse keys.
- Add root scripts for seed, agent harness, and evals.
- Remove root/package `test` scripts and Vitest dependencies; do not create replacement test files.
- Update README setup commands, service list, project tree, and keep existing `pnpm` workspace conventions.

Done when:

- Only API and Platform remain under `apps`; only Agent and the five retained shared packages remain under `packages`.
- Searching the workspace finds no imports or configuration references to admin, worker, Redis, storage, S3, generic telemetry, or removed modules.
- Searching the workspace finds no `*.test.*`, `*.spec.*`, Vitest dependency, or `test` script.
- Install, typecheck, and production build pass after cleanup.
- The API, platform, and empty agent package start independently.
- Missing required production secrets fail with a clear configuration error.

### Task 2 — Create the product API and seed

Deliverables:

- Add the focused catalog, chat-session, draft, confirmation, order, idempotency, and Anvia memory Prisma models and migration.
- Add an idempotent seed script that reads the three exact fixture paths.
- Add module-driven `storefront`, `products`, `chat-sessions`, `drafts`, and `orders` folders with `schema.ts`, `services.ts`, `types.ts`, and `router.ts` only where useful.
- Implement the seven store/catalog endpoints, including recommendations, rankings, and categories.
- Implement draft item/customer/validation/summary/cancellation endpoints.
- Implement confirmation and order lookup with an ownership check, hidden confirmation grant, stable idempotency, fresh inventory validation, and one database transaction.
- Return small typed JSON responses and stable error codes.

Done when:

- Running the seed twice produces no duplicates.
- Five products, one safe customer profile, and three historical orders exist.
- Manual HTTP smoke checks cover search/filter/sort/pagination, detail, recommendations, ranking, categories, out-of-stock, MOQ, insufficient-stock, duplicate-name, and store profile.
- Manual flow checks cover draft auto-create, add/update/remove, customer validation, latest-customer reuse, draft validation, summary, stale version, cancellation, explicit confirmation, expired confirmation, safe retry, and cross-owner lookup.
- A failed order does not decrement stock; a successful order decrements stock exactly once.

### Task 3 — Prepare the order agent

Follow the Day 11 agent-first order: build it before connecting chat or frontend.

Deliverables:

- Add a provider-neutral `createResellerOrderAgent()` using Anvia `AgentBuilder`.
- Add short base instructions covering trusted data, language matching, order confirmation, and tool-use rules.
- Add the 18 HTTP-backed tools and required tool chains listed above.
- Add `runner-dev.ts` so the agent can be validated from the terminal with the real seeded API.
- Use a bounded maximum-turn limit suitable for multi-tool search, draft validation, confirmation, and order creation.
- Keep model, tools, tracing, and memory injectable so the CLI and evaluation runner can use controlled dependencies.

Done when:

- CLI prompts can list/sort/recommend products, inspect a product, and explain stock/MOQ failures.
- A CLI conversation can add and modify a draft, collect customer data, present one final summary, and confirm a valid order.
- CLI smoke scenarios prove that tool inputs are validated and API errors are mapped without leaking raw internals.
- The agent never creates an order before explicit confirmation.

### Task 4 — Add Langfuse observability and evaluation

Deliverables:

- Create Anvia Langfuse tracing with `@anvia/langfuse` and attach it with `.observe(...)`.
- Add session, anonymous user, environment, model, release, and evaluation-case identifiers as trace metadata; do not trace secrets or excluded fixture PII.
- Add a small `evals` runner that exercises the real agent and captures output, tool calls, pass/fail metrics, and trace IDs.
- Flush tracing at the end of CLI/evaluation runs and during graceful API shutdown.
- Document how to inspect one conversation and one evaluation run in Langfuse.

Initial evaluation cases, adapted from the 15 behavior cases already present in `reseller-order-app`:

1. Keyword plus budget uses `searchProducts` with `orderableOnly=true`.
2. Price plus stock uses product detail followed by exact-quantity availability.
3. Empty results are retried without fabricating a product.
4. Out-of-stock product is not added and alternatives are requested.
5. Category plus budget uses deterministic recommendations.
6. Variant request checks product detail and does not invent variants.
7. Below-MOQ quantity returns the authoritative mutation error.
8. Quantity above stock returns the authoritative mutation error.
9. Add and update flow automatically creates and modifies an active draft.
10. Incomplete customer data blocks summary/confirmation and reports missing fields.
11. Ambiguous acknowledgement reads the active draft but does not confirm.
12. Explicit confirmation of the latest exact summary creates one order.
13. Confirmation retry after timeout returns the same order.
14. Prompt injection asking for an invented price still uses catalog data.
15. Cross-session/order-owner lookup returns `ORDER_NOT_FOUND`.

Add a small fixture-specific case for the duplicate `Duplicate Title` rows: the agent must ask for clarification instead of guessing an ID.

Done when:

- The evaluation command exits non-zero when a required behavior fails.
- Each case has a correlated Langfuse trace and local machine-readable result.
- No password, bank/card, crypto, SSN, network identifier, cookie, or provider key appears in trace metadata or artifacts.

### Task 5 — Create the chat API and memory

Deliverables:

- Use the Anvia Prisma memory models and migration prepared with the transactional schema.
- Create one Prisma memory store with `@anvia/memory-prisma`.
- Add `POST /api/chat/sessions` plus session-bound history and streaming chat routes.
- Build the agent in the route with injected memory, Langfuse tracing, and trusted API tools.
- Use `agent.session(sessionId, { userId })`, verify the `ChatSession` belongs to the anonymous user, and trace the same session ID.
- Stream with `createEventStream(..., { format: "jsonl" })` from `@anvia/server`.
- Validate that the last incoming message is a user message and apply request/body limits.
- Forward only trusted session context to the HTTP tool client; never accept it in model tool input.

Done when:

- A response streams text and tool events instead of waiting for one final JSON payload.
- Reloading the same session restores message history.
- A request cannot read or continue a different chat session without its session ID.
- Draft/order tools remain bound to the configured chat session.
- Provider/tool failures become safe stream errors and are recorded in memory/tracing.

### Task 6 — Create the frontend

Deliverables:

- Replace the broad platform dashboard home with one focused ordering chat page while preserving the profile shell and removing login/register screens.
- Use `useChat` and `initialMessagesFromMemory` from `@anvia/react`.
- Use `ChatProvider`, `Thread`, `Message`, and `Composer` from `@anvia/react-ui`, styled with the existing `@repo/ui` system.
- Load/create one anonymous session ID on entry, hydrate history, and connect to the JSONL endpoint.
- Render user and assistant messages, streaming/loading/error states, and visible tool activity in simple customer language.
- Adapt Anvia tool events/results into focused UI cards without inventing a second chat protocol:
  - product list/detail cards with quantity selection;
  - active draft card with update/remove/continue actions;
  - customer/shipping form when required;
  - authoritative confirmation-summary card;
  - confirmed-order success card.
- Card actions queue clear natural-language messages to the agent. They do not bypass the agent by calling draft/order mutation endpoints directly.
- Disable duplicate sends during streaming and keep the composer keyboard-accessible.

Done when:

- A visitor can search, select, add/update/remove draft items, save recipient data, validate, confirm, and receive an order number entirely through chat without signing in.
- Refreshing the page restores the same conversation.
- Out-of-stock, MOQ, duplicate-title, API error, and disconnected-stream states are understandable.
- Platform build and typecheck pass, followed by manual desktop and mobile-width checks.

## Implementation sequence and gates

```text
Task 1: project ready
    -> Task 2: deterministic API and seed ready
        -> Task 3: agent works in CLI
            -> Task 4: behavior measured and traced
                -> Task 5: agent exposed as chat API with memory
                    -> Task 6: frontend consumes chat API
```

Do not start the next task until the current task's “Done when” checks pass. This preserves the Day 11 agent-first workflow and keeps failures easy to locate.

## Commit plan

Use short Conventional Commits written like a normal developer. Commit by purpose, not by file count, and do not put unrelated tasks in one commit.

Format:

```text
<type>(<scope>): <short action>
```

Rules:

- Prefer `feat`, `chore`, `fix`, and `docs`.
- Use an imperative, lowercase subject without a period.
- Keep the subject short, preferably below 60 characters.
- Commit dependency and lockfile changes with the feature that needs them.
- Commit a Prisma migration with its schema change.
- Do not create `test:` commits because this project will not add test files.
- Do not commit a broken typecheck/build state.
- The exact number of commits may change when two changes cannot safely be separated.

### Plan commit

```text
docs: add reseller order plan
```

### Task 1 commits

```text
chore: remove unused template services
chore: organize app modules
chore: prepare Anvia workspace
```

### Task 2 commits

```text
feat(db): add order schema
feat(db): seed fixtures
feat(api): add catalog endpoints
feat(api): add draft order flow
feat(api): add order confirmation
```

### Task 3 commits

```text
feat(agent): add order agent
feat(agent): add catalog tools
feat(agent): add order tools
```

### Task 4 commits

```text
feat(agent): add Langfuse tracing
feat(agent): add order evaluations
```

### Task 5 commits

```text
feat(api): add chat memory
feat(api): stream agent chat
```

### Task 6 commits

```text
feat(platform): add order chat
feat(platform): add order flow cards
feat(platform): restore chat sessions
```

### Final documentation commit

```text
docs: update app guide
```

## Verification commands

The exact filters may change with final package names, but the implementation should end with commands equivalent to:

```sh
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm --filter @repo/api typecheck
pnpm --filter @repo/agent typecheck
pnpm agent:dev
pnpm agent:eval
pnpm --filter @repo/platform typecheck
pnpm typecheck
pnpm build
pnpm check
```

## Final acceptance scenario

1. Sign in to the platform.
2. Ask: “Show me products I can order.”
3. Choose `Normal Product` and request quantity `2`.
4. The agent checks exact availability and adds the product to an automatically created active draft.
5. Change the quantity, remove/re-add an item, and verify that totals are recalculated by the API.
6. Continue the order; the agent asks only for missing recipient name, WhatsApp, and complete address.
7. Save the customer data and request the final summary.
8. The API revalidates stock/MOQ/customer data, returns the exact draft version, and prepares a hidden confirmation grant.
9. Verify that an ambiguous acknowledgement does not create an order.
10. Explicitly confirm the latest summary. The API creates exactly one order and the agent returns its official order number.
11. Retry the same confirmation and verify that idempotency returns the same order without another stock decrement.
12. Refresh the page and verify that conversation and active/confirmed state are restored.
13. Verify the run and tool calls in Langfuse.
14. Try the out-of-stock, MOQ, excessive quantity, duplicate-title, prompt-injection, expired-summary, and cross-owner lookup cases and verify that no invalid order or data leak occurs.
