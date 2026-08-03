import { zValidator } from "@hono/zod-validator";
import { Hono, type Context } from "hono";
import { HttpError } from "../../http-error";
import { invalidRequest } from "../../request-validation";
import type { AuthVariables } from "../auth/middleware";
import {
  addDraftItemSchema,
  draftItemParamsSchema,
  saveCustomerDataSchema,
  sessionParamsSchema,
  updateDraftItemSchema,
} from "./schema";
import {
  addDraftItem,
  cancelDraft,
  getActiveDraft,
  getLatestCustomerData,
  getOrderSummary,
  removeDraftItem,
  saveCustomerData,
  updateDraftItem,
  validateDraft,
} from "./service";

export const draftsRouter = new Hono<{ Variables: AuthVariables }>()
  .use("*", async (c, next) => {
    if (!c.get("user")) throw new HttpError(401, "UNAUTHORIZED", "Authentication is required.");
    await next();
  })
  .get("/:sessionId/draft", zValidator("param", sessionParamsSchema, invalidRequest), async (c) => {
    return c.json({ draft: await getActiveDraft(c.req.valid("param").sessionId, userId(c)) }, 200);
  })
  .post(
    "/:sessionId/draft/items",
    zValidator("param", sessionParamsSchema, invalidRequest),
    zValidator("json", addDraftItemSchema, invalidRequest),
    async (c) => {
      return c.json(
        {
          draft: await addDraftItem(c.req.valid("param").sessionId, userId(c), c.req.valid("json")),
        },
        201,
      );
    },
  )
  .patch(
    "/:sessionId/draft/items/:itemId",
    zValidator("param", draftItemParamsSchema, invalidRequest),
    zValidator("json", updateDraftItemSchema, invalidRequest),
    async (c) => {
      const { itemId, sessionId } = c.req.valid("param");
      return c.json(
        {
          draft: await updateDraftItem(sessionId, userId(c), itemId, c.req.valid("json").quantity),
        },
        200,
      );
    },
  )
  .delete(
    "/:sessionId/draft/items/:itemId",
    zValidator("param", draftItemParamsSchema, invalidRequest),
    async (c) => {
      const { itemId, sessionId } = c.req.valid("param");
      return c.json({ draft: await removeDraftItem(sessionId, userId(c), itemId) }, 200);
    },
  )
  .put(
    "/:sessionId/draft/customer",
    zValidator("param", sessionParamsSchema, invalidRequest),
    zValidator("json", saveCustomerDataSchema, invalidRequest),
    async (c) => {
      return c.json(
        {
          draft: await saveCustomerData(
            c.req.valid("param").sessionId,
            userId(c),
            c.req.valid("json"),
          ),
        },
        200,
      );
    },
  )
  .get(
    "/:sessionId/customer/latest",
    zValidator("param", sessionParamsSchema, invalidRequest),
    async (c) => {
      return c.json(
        { customer: await getLatestCustomerData(c.req.valid("param").sessionId, userId(c)) },
        200,
      );
    },
  )
  .post(
    "/:sessionId/draft/validate",
    zValidator("param", sessionParamsSchema, invalidRequest),
    async (c) => {
      return c.json(await validateDraft(c.req.valid("param").sessionId, userId(c)), 200);
    },
  )
  .post(
    "/:sessionId/draft/summary",
    zValidator("param", sessionParamsSchema, invalidRequest),
    async (c) => {
      return c.json(
        { summary: await getOrderSummary(c.req.valid("param").sessionId, userId(c)) },
        200,
      );
    },
  )
  .delete(
    "/:sessionId/draft",
    zValidator("param", sessionParamsSchema, invalidRequest),
    async (c) => {
      return c.json({ draft: await cancelDraft(c.req.valid("param").sessionId, userId(c)) }, 200);
    },
  );

function userId(c: Context<{ Variables: AuthVariables }>) {
  const user = c.get("user");
  if (!user) throw new HttpError(401, "UNAUTHORIZED", "Authentication is required.");
  return user.id;
}
