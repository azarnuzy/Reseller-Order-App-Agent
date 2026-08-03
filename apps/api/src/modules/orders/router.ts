import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { anonymousUserId } from "../../anonymous-user";
import { invalidRequest } from "../../request-validation";
import { confirmOrderSchema, orderParamsSchema } from "./schema";
import { confirmOrder, getOrder } from "./service";

export const ordersRouter = new Hono()
  .post(
    "/:sessionId/orders",
    zValidator("param", orderParamsSchema.omit({ orderNumber: true }), invalidRequest),
    zValidator("json", confirmOrderSchema, invalidRequest),
    async (c) => {
      const result = await confirmOrder(
        c.req.valid("param").sessionId,
        anonymousUserId,
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
      return c.json({ order: await getOrder(sessionId, anonymousUserId, orderNumber) }, 200);
    },
  );
