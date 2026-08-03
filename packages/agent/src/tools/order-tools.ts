import { createTool, type AnyTool } from "@anvia/core";
import { z } from "zod";
import { executeResellerApiCall, type ResellerApiClient } from "./reseller-api-client";
import {
  confirmOrderInputSchema,
  getOrderInputSchema,
  orderSchema,
  toolResultSchema,
} from "./tool-schemas";

const confirmationResponseSchema = z
  .object({ idempotent: z.boolean(), order: orderSchema })
  .strict();
const orderResponseSchema = z.object({ order: orderSchema }).transform(({ order }) => order);

export function createOrderTools(client: ResellerApiClient): AnyTool[] {
  return [
    createTool({
      name: "confirmOrder",
      description:
        "Create an order only after explicit customer confirmation of the latest summary. Pass exactly that summary's draftVersion.",
      input: confirmOrderInputSchema,
      output: toolResultSchema(confirmationResponseSchema),
      execute: ({ draftVersion }) =>
        executeResellerApiCall(confirmationResponseSchema, () => client.confirmOrder(draftVersion)),
    }),
    createTool({
      name: "getOrder",
      description: "Look up one public order number within this trusted customer session.",
      input: getOrderInputSchema,
      output: toolResultSchema(orderSchema),
      execute: ({ orderNumber }) =>
        executeResellerApiCall(orderResponseSchema, () => client.getOrder(orderNumber)),
    }),
  ];
}
