import { zValidator } from "@hono/zod-validator";
import { Hono, type Context } from "hono";
import { HttpError } from "../../http-error";
import { invalidRequest } from "../../request-validation";
import type { AuthVariables } from "../auth/middleware";
import { confirmOrderSchema, orderParamsSchema } from "./schema";
import { confirmOrder, getOrder } from "./service";

export const ordersRouter = new Hono<{ Variables: AuthVariables }>()
  .use("*", async (c, next) => {
    if (!c.get("user")) throw new HttpError(401, "UNAUTHORIZED", "Authentication is required.");
    await next();
  })
  .post(
    "/:sessionId/orders",
    zValidator("param", orderParamsSchema.omit({ orderNumber: true }), invalidRequest),
    zValidator("json", confirmOrderSchema, invalidRequest),
    async (c) => {
      const result = await confirmOrder(
        c.req.valid("param").sessionId,
        userId(c),
        c.req.valid("json").draftVersion,
      );
      return c.json(result, 200);
    },
  )
  .get(
    "/:sessionId/orders/:orderNumber",
    zValidator("param", orderParamsSchema, invalidRequest),
    async (c) => {
      const { orderNumber, sessionId } = c.req.valid("param");
      return c.json({ order: await getOrder(sessionId, userId(c), orderNumber) }, 200);
    },
  );

function userId(c: Context<{ Variables: AuthVariables }>) {
  const user = c.get("user");
  if (!user) throw new HttpError(401, "UNAUTHORIZED", "Authentication is required.");
  return user.id;
}
