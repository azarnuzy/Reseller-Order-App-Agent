import { createEventStream } from "@anvia/server";
import { zValidator } from "@hono/zod-validator";
import {
  createConfiguredModel,
  createResellerOrderAgent,
  getAgentTracing,
  ResellerApiClient,
  resellerTraceOptions,
} from "@repo/agent";
import { agentApiConfig } from "@repo/config";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { anonymousUserId } from "../../anonymous-user";
import { prisma } from "../../prisma";
import { invalidRequest } from "../../request-validation";
import { requireOwnedChatSession } from "../chat-sessions/service";
import { chatMemory } from "./memory";
import {
  chatMessageRequestSchema,
  chatSessionParamsSchema,
  getLastUserMessageText,
  MAX_CHAT_BODY_BYTES,
} from "./schema";

export const chatRouter = new Hono()
  .get(
    "/:sessionId/messages",
    zValidator("param", chatSessionParamsSchema, invalidRequest),
    async (c) => {
      const { sessionId } = c.req.valid("param");
      await requireOwnedChatSession(prisma, sessionId, anonymousUserId);
      const messages = await chatMemory.load({ sessionId, userId: anonymousUserId });
      return c.json({ messages }, 200);
    },
  )
  .post(
    "/:sessionId/messages",
    bodyLimit({
      maxSize: MAX_CHAT_BODY_BYTES,
      onError: (c) =>
        c.json(
          {
            error: {
              code: "PAYLOAD_TOO_LARGE",
              message: "The chat request is too large.",
            },
          },
          413,
        ),
    }),
    zValidator("param", chatSessionParamsSchema, invalidRequest),
    zValidator("json", chatMessageRequestSchema, invalidRequest),
    async (c) => {
      const { sessionId } = c.req.valid("param");
      await requireOwnedChatSession(prisma, sessionId, anonymousUserId);

      const apiClient = new ResellerApiClient({
        baseUrl: agentApiConfig.internalUrl,
        sessionId,
      });
      const tracing = getAgentTracing();
      const agent = createResellerOrderAgent({
        apiClient,
        memory: chatMemory,
        model: createConfiguredModel(),
        tracing,
      });
      const userMessage = {
        content: [{ text: getLastUserMessageText(c.req.valid("json")), type: "text" as const }],
        role: "user" as const,
      };
      const stream = agent
        .session(sessionId, { userId: anonymousUserId })
        .prompt(userMessage)
        .withTrace(resellerTraceOptions({ sessionId }))
        .stream();

      return createEventStream(safeChatStream(stream), { format: "jsonl" });
    },
  );

async function* safeChatStream<TEvent>(stream: AsyncIterable<TEvent>) {
  try {
    yield* stream;
  } catch {
    throw new Error("The assistant is temporarily unavailable. Please try again.");
  }
}
