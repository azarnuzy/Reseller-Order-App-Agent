import { createTool, type AnyTool } from "@anvia/core";
import { z } from "zod";
import { executeResellerApiCall, type ResellerApiClient } from "./reseller-api-client";
import {
  addDraftItemInputSchema,
  draftItemInputSchema,
  draftSchema,
  draftValidationSchema,
  emptyInputSchema,
  orderSummarySchema,
  saveCustomerDataInputSchema,
  toolResultSchema,
  updateDraftItemInputSchema,
} from "./tool-schemas";

const draftResponseSchema = z.object({ draft: draftSchema }).transform(({ draft }) => draft);
const activeDraftResponseSchema = z
  .object({ draft: draftSchema.nullable() })
  .transform(({ draft }) => draft);
const previousCustomerSchema = z
  .object({
    address: z.string(),
    email: z.string().nullable(),
    name: z.string(),
    note: z.string().nullable(),
    whatsapp: z.string(),
  })
  .strict();
const customerResponseSchema = z
  .object({ customer: previousCustomerSchema.nullable() })
  .transform(({ customer }) => customer);
const summaryResponseSchema = z
  .object({ summary: orderSummarySchema })
  .transform(({ summary }) => summary);

export function createDraftTools(client: ResellerApiClient): AnyTool[] {
  return [
    createTool({
      name: "getActiveDraft",
      description:
        "Read the current trusted active draft, including items, recipient, totals, and version. Use this for ambiguous acknowledgements such as okay or looks good; then request explicit confirmation without regenerating the summary.",
      input: emptyInputSchema,
      output: toolResultSchema(draftSchema.nullable()),
      execute: () =>
        executeResellerApiCall(activeDraftResponseSchema, () => client.getActiveDraft()),
    }),
    createTool({
      name: "addDraftItem",
      description:
        "Add or replace one exact product quantity in the active draft. The API auto-creates a draft and authoritatively validates stock and MOQ.",
      input: addDraftItemInputSchema,
      output: toolResultSchema(draftSchema),
      execute: (input) =>
        executeResellerApiCall(draftResponseSchema, () => client.addDraftItem(input)),
    }),
    createTool({
      name: "updateDraftItem",
      description:
        "Set a new exact quantity for one draft item ID after reading the active draft. The API revalidates stock and MOQ.",
      input: updateDraftItemInputSchema,
      output: toolResultSchema(draftSchema),
      execute: (input) =>
        executeResellerApiCall(draftResponseSchema, () => client.updateDraftItem(input)),
    }),
    createTool({
      name: "removeDraftItem",
      description: "Remove one exact draft item ID after reading the active draft.",
      input: draftItemInputSchema,
      output: toolResultSchema(draftSchema),
      execute: ({ itemId }) =>
        executeResellerApiCall(draftResponseSchema, () => client.removeDraftItem(itemId)),
    }),
    createTool({
      name: "saveCustomerData",
      description:
        "Save validated recipient name, WhatsApp, complete address, and optional email/note to the active draft.",
      input: saveCustomerDataInputSchema,
      output: toolResultSchema(draftSchema),
      execute: (input) =>
        executeResellerApiCall(draftResponseSchema, () => client.saveCustomerData(input)),
    }),
    createTool({
      name: "getLatestCustomerData",
      description:
        "Read recipient data from the latest confirmed order in this session. Ask permission before saving it into the current draft.",
      input: emptyInputSchema,
      output: toolResultSchema(previousCustomerSchema.nullable()),
      execute: () =>
        executeResellerApiCall(customerResponseSchema, () => client.getLatestCustomerData()),
    }),
    createTool({
      name: "validateDraft",
      description:
        "Revalidate all draft items and required recipient fields. Use immediately before requesting an order summary.",
      input: emptyInputSchema,
      output: toolResultSchema(draftValidationSchema),
      execute: () => executeResellerApiCall(draftValidationSchema, () => client.validateDraft()),
    }),
    createTool({
      name: "getOrderSummary",
      description:
        "Create the authoritative final summary for a valid draft and return its exact draftVersion. This does not create an order. Do not call it for an ambiguous acknowledgement of a summary that was already presented.",
      input: emptyInputSchema,
      output: toolResultSchema(orderSummarySchema),
      execute: () => executeResellerApiCall(summaryResponseSchema, () => client.getOrderSummary()),
    }),
    createTool({
      name: "cancelDraft",
      description:
        "Cancel the current active draft after reading it and confirming the customer's intent.",
      input: emptyInputSchema,
      output: toolResultSchema(draftSchema),
      execute: () => executeResellerApiCall(draftResponseSchema, () => client.cancelDraft()),
    }),
  ];
}
