import { z } from "zod";

const optionalBooleanQuery = z.preprocess((value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.boolean().optional());

const commaSeparatedValues = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}, z.array(z.string().min(1)).optional());

export const productIdParamsSchema = z.object({
  productId: z.string().trim().min(1),
});

export const productSearchQuerySchema = z
  .object({
    category: z.string().trim().min(1).optional(),
    cursor: z.string().cuid().optional(),
    inStock: optionalBooleanQuery,
    limit: z.coerce.number().int().min(1).max(50).default(10),
    maxPrice: z.coerce.number().positive().optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    orderable: optionalBooleanQuery,
    orderableOnly: optionalBooleanQuery,
    q: z.string().trim().min(1).max(100).optional(),
    sort: z.enum(["PRICE_ASC", "PRICE_DESC", "RATING_DESC", "TITLE_ASC"]).default("TITLE_ASC"),
  })
  .refine(
    ({ maxPrice, minPrice }) =>
      maxPrice === undefined || minPrice === undefined || maxPrice >= minPrice,
    { message: "maxPrice must be greater than or equal to minPrice.", path: ["maxPrice"] },
  );

export const availabilityQuerySchema = z.object({
  quantity: z.coerce.number().int().positive().optional(),
});

export const recommendationQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  excludeProductIds: commaSeparatedValues,
  limit: z.coerce.number().int().min(1).max(20).default(5),
  maxPrice: z.coerce.number().nonnegative().optional(),
  tags: commaSeparatedValues,
});

export const rankingQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(5),
  ranking: z.enum(["BEST_SELLING", "MOST_POPULAR", "HIGHEST_RATED"]),
});

export type ProductSearchQuery = z.infer<typeof productSearchQuerySchema>;
export type RecommendationQuery = z.infer<typeof recommendationQuerySchema>;
export type RankingQuery = z.infer<typeof rankingQuerySchema>;
