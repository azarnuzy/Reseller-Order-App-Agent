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
        "Search or browse products with server-side filters, pagination, and deterministic sorting. Use orderableOnly=true for products a customer can buy.",
      input: searchProductsInputSchema,
      output: toolResultSchema(searchResponseSchema),
      execute: (input) =>
        executeResellerApiCall(searchResponseSchema, () => client.searchProducts(input)),
    }),
    createTool({
      name: "getProductDetail",
      description:
        "Get current trusted detail for one exact product ID. Use this before answering detailed price, stock, or variant questions.",
      input: productIdInputSchema,
      output: toolResultSchema(productSchema),
      execute: ({ productId }) =>
        executeResellerApiCall(productResponseSchema, () => client.getProductDetail(productId)),
    }),
    createTool({
      name: "checkProductAvailability",
      description:
        "Check current orderability, stock, and MOQ for one exact product ID and optional exact quantity.",
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
        "Get deterministic, currently orderable product recommendations for known category, tags, budget, and exclusions.",
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
