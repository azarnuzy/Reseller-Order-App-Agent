import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { anonymousUserId } from "../../anonymous-user";
import { invalidRequest } from "../../request-validation";
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

export const draftsRouter = new Hono()
  .get("/:sessionId/draft", zValidator("param", sessionParamsSchema, invalidRequest), async (c) => {
    return c.json(
      { draft: await getActiveDraft(c.req.valid("param").sessionId, anonymousUserId) },
      200,
    );
  })
  .post(
    "/:sessionId/draft/items",
    zValidator("param", sessionParamsSchema, invalidRequest),
    zValidator("json", addDraftItemSchema, invalidRequest),
    async (c) => {
      return c.json(
        {
          draft: await addDraftItem(
            c.req.valid("param").sessionId,
            anonymousUserId,
            c.req.valid("json"),
          ),
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
          draft: await updateDraftItem(
            sessionId,
            anonymousUserId,
            itemId,
            c.req.valid("json").quantity,
          ),
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
      return c.json({ draft: await removeDraftItem(sessionId, anonymousUserId, itemId) }, 200);
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
            anonymousUserId,
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
        {
          customer: await getLatestCustomerData(c.req.valid("param").sessionId, anonymousUserId),
        },
        200,
      );
    },
  )
  .post(
    "/:sessionId/draft/validate",
    zValidator("param", sessionParamsSchema, invalidRequest),
    async (c) => {
      return c.json(await validateDraft(c.req.valid("param").sessionId, anonymousUserId), 200);
    },
  )
  .post(
    "/:sessionId/draft/summary",
    zValidator("param", sessionParamsSchema, invalidRequest),
    async (c) => {
      return c.json(
        { summary: await getOrderSummary(c.req.valid("param").sessionId, anonymousUserId) },
        200,
      );
    },
  )
  .delete(
    "/:sessionId/draft",
    zValidator("param", sessionParamsSchema, invalidRequest),
    async (c) => {
      return c.json(
        { draft: await cancelDraft(c.req.valid("param").sessionId, anonymousUserId) },
        200,
      );
    },
  );
