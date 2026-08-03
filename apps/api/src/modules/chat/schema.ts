import { z } from "zod";

export const MAX_CHAT_BODY_BYTES = 64 * 1024;

const MAX_INCOMING_MESSAGES = 100;
const MAX_USER_MESSAGE_CHARACTERS = 8_000;

const incomingMessageSchema = z
  .object({
    content: z.unknown(),
    role: z.string(),
  })
  .passthrough();

const userTextPartSchema = z
  .object({
    text: z.string().trim().min(1),
    type: z.literal("text"),
  })
  .strict();

export const chatSessionParamsSchema = z.object({
  sessionId: z.string().trim().min(1).max(128),
});

export const chatMessageRequestSchema = z
  .object({
    messages: z.array(incomingMessageSchema).min(1).max(MAX_INCOMING_MESSAGES),
    stream: z.literal(true).optional(),
  })
  .strict()
  .superRefine((request, context) => {
    const lastMessage = request.messages.at(-1);
    if (lastMessage?.role !== "user") {
      context.addIssue({
        code: "custom",
        message: "The last message must have the user role.",
        path: ["messages", request.messages.length - 1, "role"],
      });
      return;
    }

    const content = z.array(userTextPartSchema).min(1).safeParse(lastMessage.content);
    if (!content.success) {
      context.addIssue({
        code: "custom",
        message: "The last user message must contain text only.",
        path: ["messages", request.messages.length - 1, "content"],
      });
      return;
    }

    const characterCount = content.data.map((part) => part.text).join("\n").length;
    if (characterCount > MAX_USER_MESSAGE_CHARACTERS) {
      context.addIssue({
        code: "too_big",
        inclusive: true,
        maximum: MAX_USER_MESSAGE_CHARACTERS,
        message: `The last user message must not exceed ${MAX_USER_MESSAGE_CHARACTERS} characters.`,
        origin: "string",
        path: ["messages", request.messages.length - 1, "content"],
      });
    }
  });

export function getLastUserMessageText(request: z.output<typeof chatMessageRequestSchema>) {
  const lastMessage = request.messages.at(-1);
  const content = z.array(userTextPartSchema).min(1).parse(lastMessage?.content);
  return content.map((part) => part.text).join("\n");
}
