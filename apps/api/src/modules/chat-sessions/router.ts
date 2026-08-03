import { Hono } from "hono";
import { anonymousUserId } from "../../anonymous-user";
import { createChatSession } from "./service";

export const chatSessionsRouter = new Hono().post("/", async (c) => {
  return c.json({ session: await createChatSession(anonymousUserId) }, 201);
});
