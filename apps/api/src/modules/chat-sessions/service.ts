import type { Prisma, PrismaClient } from "@prisma/client";
import { HttpError } from "../../http-error";
import { prisma } from "../../prisma";
import type { ChatSessionResponse } from "./types";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export async function createChatSession(userId: string): Promise<ChatSessionResponse> {
  return prisma.chatSession.create({
    data: { userId },
    select: { createdAt: true, id: true, updatedAt: true },
  });
}

export async function requireOwnedChatSession(
  database: DatabaseClient,
  sessionId: string,
  userId: string,
) {
  const session = await database.chatSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true, userId: true },
  });

  if (!session) {
    throw new HttpError(404, "SESSION_NOT_FOUND", "Chat session was not found.");
  }

  return session;
}
