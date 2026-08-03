import { Studio } from "@anvia/studio";
import { agentApiConfig } from "@repo/config";
import { z } from "zod";
import { createResellerOrderAgent } from "./agent";
import { createConfiguredModel } from "./providers/openai";
import { ResellerApiClient } from "./tools/reseller-api-client";

const sessionResponseSchema = z.object({
  session: z.object({
    createdAt: z.iso.datetime(),
    id: z.string().min(1),
    updatedAt: z.iso.datetime(),
  }),
});

async function main() {
  const headers = trustedHeaders();
  const model = createConfiguredModel();
  const studioPort = parseStudioPort();
  const configuredSessionId = process.env.AGENT_SESSION_ID?.trim();
  const bootstrapClient = new ResellerApiClient({
    baseUrl: agentApiConfig.internalUrl,
    headers,
    sessionId: configuredSessionId ?? "studio-bootstrap",
  });
  const sessionId = configuredSessionId ?? (await createSession(bootstrapClient));
  const apiClient = new ResellerApiClient({
    baseUrl: agentApiConfig.internalUrl,
    headers,
    sessionId,
  });
  const agent = createResellerOrderAgent({ apiClient, model });

  new Studio([agent]).start({ port: studioPort });
  console.log(`Reseller order agent is available in Anvia Studio.`);
  console.log(`Ordering API session: ${sessionId}`);
  console.log(`Playground: http://localhost:${studioPort}/playground`);
}

async function createSession(client: ResellerApiClient) {
  const parsed = sessionResponseSchema.safeParse(await client.createChatSession());
  if (!parsed.success) {
    throw new Error("The API returned an invalid chat-session response.");
  }
  return parsed.data.session.id;
}

function trustedHeaders(): Headers {
  const headers = new Headers();
  const cookie = process.env.AGENT_AUTH_COOKIE?.trim();
  const authorization = process.env.AGENT_AUTHORIZATION?.trim();
  if (cookie) headers.set("Cookie", cookie);
  if (authorization) headers.set("Authorization", authorization);
  if (!cookie && !authorization) {
    throw new Error(
      "Set AGENT_AUTH_COOKIE or AGENT_AUTHORIZATION to an authenticated API credential.",
    );
  }
  return headers;
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

main().catch((error) => {
  console.error(`Anvia Studio failed to start: ${safeErrorMessage(error)}`);
  process.exitCode = 1;
});

function safeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error.";
}
