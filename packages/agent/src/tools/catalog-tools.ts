import { createTool, type AnyTool } from "@anvia/core";
import { z } from "zod";
import { executeResellerApiCall, type ResellerApiClient } from "./reseller-api-client";
import {
  availabilityInputSchema,
  availabilitySchema,
  categorySchema,
  emptyInputSchema,
  productIdInputSchema,
  productSchema,
  rankingInputSchema,
  recommendationInputSchema,
  searchProductsInputSchema,
  storeProfileSchema,
  toolResultSchema,
} from "./tool-schemas";

const storefrontResponseSchema = z
  .object({ store: storeProfileSchema })
  .transform(({ store }) => store);
const searchResponseSchema = z
  .object({ nextCursor: z.string().nullable(), products: z.array(productSchema) })
  .strict();
const productResponseSchema = z
  .object({ product: productSchema })
  .transform(({ product }) => product);
const availabilityResponseSchema = z
  .object({ availability: availabilitySchema })
  .transform(({ availability }) => availability);
const recommendationResponseSchema = z
  .object({
    appliedCriteria: z
      .object({
        category: z.string().nullable(),
        excludeProductIds: z.array(z.string()),
        maxPrice: z.number().nonnegative().nullable(),
        tags: z.array(z.string()),
      })
      .strict(),
    products: z.array(productSchema),
  })
  .strict();
const rankingResponseSchema = z
  .object({
    products: z.array(
      z
        .object({
          orderCount: z.number().int().nonnegative(),
          product: productSchema,
          rank: z.number().int().positive(),
          unitsSold: z.number().int().nonnegative(),
        })
        .strict(),
    ),
    ranking: z.enum(["BEST_SELLING", "MOST_POPULAR", "HIGHEST_RATED"]),
  })
  .strict();
const categoriesResponseSchema = z
  .object({ categories: z.array(categorySchema) })
  .transform(({ categories }) => categories);

export function createCatalogTools(client: ResellerApiClient): AnyTool[] {
  return [
    createTool({
      name: "getStoreProfile",
      description:
        "Get the trusted store name, currency, locale, order policy, and shipping policy.",
      input: emptyInputSchema,
      output: toolResultSchema(storeProfileSchema),
      execute: () =>
        executeResellerApiCall(storefrontResponseSchema, () => client.getStoreProfile()),
    }),
    createTool({
      name: "searchProducts",
      description:
        "Search or browse products with server-side filters, pagination, and deterministic sorting. Send q for a normal keyword search and omit every optional filter the customer did not request. On the first page omit cursor; for later pages copy the exact nextCursor returned by this tool. Use orderableOnly=true only for discovery of buyable products; omit it when resolving a named product so unavailable exact matches remain visible. If multiple results have the same exact requested title, ask the customer to choose using these results and do not call a detail tool.",
      input: searchProductsInputSchema,
      output: toolResultSchema(searchResponseSchema),
      execute: (input) =>
        executeResellerApiCall(searchResponseSchema, () => client.searchProducts(input)),
    }),
    createTool({
      name: "getProductDetail",
      description:
        "Get current trusted detail for one uniquely resolved product ID. Always use this before answering price, stock, or variant questions. Do not call it when search returned multiple exact title matches.",
      input: productIdInputSchema,
      output: toolResultSchema(productSchema),
      execute: ({ productId }) =>
        executeResellerApiCall(productResponseSchema, () => client.getProductDetail(productId)),
    }),
    createTool({
      name: "checkProductAvailability",
      description:
        "Authoritatively check current orderability, stock, and MOQ for one exact product ID and optional exact quantity. Always call this before an add decision or out-of-stock alternative flow, even when search results already show stock or isOrderable.",
      input: availabilityInputSchema,
      output: toolResultSchema(availabilitySchema),
      execute: (input) =>
        executeResellerApiCall(availabilityResponseSchema, () =>
          client.checkProductAvailability(input),
        ),
    }),
    createTool({
      name: "recommendProducts",
      description:
        "Get deterministic, currently orderable product recommendations for known category, tags, budget, and exclusions. After an OUT_OF_STOCK availability result, include that product ID in excludeProductIds.",
      input: recommendationInputSchema,
      output: toolResultSchema(recommendationResponseSchema),
      execute: (input) =>
        executeResellerApiCall(recommendationResponseSchema, () => client.recommendProducts(input)),
    }),
    createTool({
      name: "getTopProducts",
      description: "Get trusted best-selling, most-popular, or highest-rated available products.",
      input: rankingInputSchema,
      output: toolResultSchema(rankingResponseSchema),
      execute: (input) =>
        executeResellerApiCall(rankingResponseSchema, () => client.getTopProducts(input)),
    }),
    createTool({
      name: "listCategories",
      description: "List current product categories and their product counts.",
      input: emptyInputSchema,
      output: toolResultSchema(z.array(categorySchema)),
      execute: () =>
        executeResellerApiCall(categoriesResponseSchema, () => client.listCategories()),
    }),
  ];
}
