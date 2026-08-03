import { initialMessagesFromMemory } from "@anvia/react";
import type { ChatBootstrap, ChatSession } from "./order-chat-types";

export const orderChatApiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function createOrderChatSession(): Promise<ChatSession> {
  const response = await fetch(`${orderChatApiBaseUrl}/api/chat/sessions`, {
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("We couldn't start a new conversation. Please try again.");
  }

  const body = (await response.json()) as { session: ChatSession };
  return body.session;
}

export async function loadOrderChatSession(sessionId: string): Promise<ChatBootstrap> {
  const response = await fetch(
    `${orderChatApiBaseUrl}/api/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
  );

  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "This conversation is no longer available."
        : "We couldn't restore this conversation.",
    );
  }

  const body = (await response.json()) as { messages: unknown[] };
  const messages = initialMessagesFromMemory(
    body.messages as Parameters<typeof initialMessagesFromMemory>[0],
  );
  const now = new Date().toISOString();

  return {
    initialMessages: messages,
    session: { createdAt: now, id: sessionId, updatedAt: now },
  };
}

export async function createOrderChatBootstrap(): Promise<ChatBootstrap> {
  const session = await createOrderChatSession();
  return { initialMessages: [], session };
}

