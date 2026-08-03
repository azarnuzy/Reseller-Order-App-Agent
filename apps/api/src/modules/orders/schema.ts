import { z } from "zod";
import { sessionParamsSchema } from "../drafts/schema";

export const confirmOrderSchema = z
  .object({
    draftVersion: z.number().int().positive(),
  })
  .strict();

export const orderParamsSchema = sessionParamsSchema.extend({
  orderNumber: z.string().trim().min(1).max(64),
});
