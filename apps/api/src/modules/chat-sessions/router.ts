import { Hono } from "hono";
import { HttpError } from "../../http-error";
import type { AuthVariables } from "../auth/middleware";
import { createChatSession } from "./service";

export const chatSessionsRouter = new Hono<{ Variables: AuthVariables }>().post("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    throw new HttpError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  return c.json({ session: await createChatSession(user.id) }, 201);
});
