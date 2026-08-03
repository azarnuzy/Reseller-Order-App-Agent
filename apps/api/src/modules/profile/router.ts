import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { anonymousUserId } from "../../anonymous-user";
import { updateProfileSchema } from "./schema";
import { getProfile, updateProfile } from "./service";

export const profileRouter = new Hono()
  .get("/", async (c) => c.json(await getProfile(anonymousUserId), 200))
  .patch("/", zValidator("json", updateProfileSchema), async (c) => {
    const result = await updateProfile(anonymousUserId, c.req.valid("json"));
    return c.json(result, 200);
  });
