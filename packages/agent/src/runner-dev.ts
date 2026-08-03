import { Studio } from "@anvia/studio";
import { agentApiConfig } from "@repo/config";
import { z } from "zod";
import { createResellerOrderAgent } from "./agent";
import {
  createResellerTraceObserver,
  getAgentTracing,
  shutdownAgentTracing,
} from "./observability/tracing";
import { createConfiguredModel } from "./providers/openai";
import { ResellerApiClient } from "./tools/reseller-api-client";

const sessionResponseSchema = z.object({
  session: z.object({
    createdAt: z.iso.datetime(),
    id: z.string().min(1),
    updatedAt: z.iso.datetime(),
  }),
});

let studio: Studio | undefined;

async function main() {
  const model = createConfiguredModel();
  const tracing = getAgentTracing();
  const studioPort = parseStudioPort();
  const configuredSessionId = process.env.AGENT_SESSION_ID?.trim();
  const bootstrapClient = new ResellerApiClient({
    baseUrl: agentApiConfig.internalUrl,
    sessionId: configuredSessionId ?? "studio-bootstrap",
  });
  const sessionId = configuredSessionId ?? (await createSession(bootstrapClient));
  const apiClient = new ResellerApiClient({
    baseUrl: agentApiConfig.internalUrl,
    sessionId,
  });
  const agent = createResellerOrderAgent({
    apiClient,
    model,
    observers: [createResellerTraceObserver(tracing, { sessionId })],
  });

  studio = new Studio([agent]).start({ port: studioPort });
  console.log(`Reseller order agent is available in Anvia Studio.`);
  console.log(`Ordering API session: ${sessionId}`);
  console.log(`Playground: http://localhost:${studioPort}/playground`);
}

async function shutdown() {
  studio?.close();
  await shutdownAgentTracing();
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdown().catch((error) => {
      console.error(`Agent tracing shutdown failed: ${safeErrorMessage(error)}`);
      process.exitCode = 1;
    });
  });
}

async function createSession(client: ResellerApiClient) {
  const parsed = sessionResponseSchema.safeParse(await client.createChatSession());
  if (!parsed.success) {
    throw new Error("The API returned an invalid chat-session response.");
  }
  return parsed.data.session.id;
}

function parseStudioPort() {
  const parsed = z.coerce
    .number()
    .int()
    .positive()
    .max(65_535)
    .safeParse(process.env.RUNNER_PORT ?? 4021);
  if (!parsed.success) throw new Error("RUNNER_PORT must be a valid TCP port.");
  return parsed.data;
}

main().catch(async (error) => {
  console.error(`Anvia Studio failed to start: ${safeErrorMessage(error)}`);
  process.exitCode = 1;
  await shutdown();
});

function safeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error.";
}
