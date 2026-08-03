import { z } from "zod";

export const emptyInputSchema = z.object({}).strict();

export const productSchema = z
  .object({
    brand: z.string().nullable(),
    category: z.string(),
    description: z.string(),
    discountedPrice: z.number().nonnegative(),
    discountPercentage: z.number().min(0).max(100),
    id: z.string().min(1),
    images: z.array(z.string().url()),
    isOrderable: z.boolean(),
    minimumOrderQuantity: z.number().int().positive(),
    price: z.number().nonnegative(),
    rating: z.number().min(0).max(5),
    sku: z.string().min(1),
    sourceId: z.number().int().positive(),
    stock: z.number().int().nonnegative(),
    tags: z.array(z.string()),
    thumbnail: z.string().url(),
    title: z.string().min(1),
  })
  .strict();

export const storeProfileSchema = z
  .object({
    currency: z.string().min(1),
    id: z.string().min(1),
    locale: z.string().min(1),
    name: z.string().min(1),
    orderPolicy: z.string(),
    shippingPolicy: z.string(),
  })
  .strict();

export const searchProductsInputSchema = z
  .object({
    category: z.string().trim().min(1).optional(),
    cursor: z.string().trim().min(1).optional(),
    inStock: z.boolean().optional(),
    limit: z.number().int().min(1).max(50).default(10),
    maxPrice: z.number().nonnegative().optional(),
    minPrice: z.number().nonnegative().optional(),
    orderableOnly: z.boolean().optional(),
    q: z.string().trim().min(1).max(100).optional(),
    sort: z.enum(["PRICE_ASC", "PRICE_DESC", "RATING_DESC", "TITLE_ASC"]).default("TITLE_ASC"),
  })
  .refine(
    ({ maxPrice, minPrice }) =>
      maxPrice === undefined || minPrice === undefined || maxPrice >= minPrice,
    { message: "maxPrice must be greater than or equal to minPrice.", path: ["maxPrice"] },
  );

export const productIdInputSchema = z.object({ productId: z.string().trim().min(1) }).strict();

export const availabilityInputSchema = productIdInputSchema.extend({
  quantity: z.number().int().positive().optional(),
});

export const recommendationInputSchema = z
  .object({
    category: z.string().trim().min(1).optional(),
    excludeProductIds: z.array(z.string().min(1)).max(20).optional(),
    limit: z.number().int().min(1).max(20).default(5),
    maxPrice: z.number().nonnegative().optional(),
    tags: z.array(z.string().trim().min(1)).max(20).optional(),
  })
  .strict();

export const rankingInputSchema = z
  .object({
    limit: z.number().int().min(1).max(20).default(5),
    ranking: z.enum(["BEST_SELLING", "MOST_POPULAR", "HIGHEST_RATED"]),
  })
  .strict();

export const availabilitySchema = z
  .object({
    canFulfill: z.boolean(),
    minimumOrderQuantity: z.number().int().positive(),
    productId: z.string().min(1),
    quantity: z.number().int().positive().nullable(),
    status: z.enum([
      "AVAILABLE",
      "OUT_OF_STOCK",
      "PRODUCT_NOT_ORDERABLE",
      "BELOW_MINIMUM_ORDER",
      "INSUFFICIENT_STOCK",
    ]),
    stock: z.number().int().nonnegative(),
  })
  .strict();

export const categorySchema = z
  .object({
    name: z.string().min(1),
    productCount: z.number().int().nonnegative(),
    slug: z.string(),
  })
  .strict();

const customerSchema = z
  .object({
    address: z.string().nullable(),
    email: z.string().nullable(),
    name: z.string().nullable(),
    note: z.string().nullable(),
    whatsapp: z.string().nullable(),
  })
  .strict();

const requiredCustomerSchema = z
  .object({
    address: z.string().min(1),
    email: z.string().nullable(),
    name: z.string().min(1),
    note: z.string().nullable(),
    whatsapp: z.string().min(1),
  })
  .strict();

const totalsSchema = z
  .object({
    currency: z.string().min(1),
    discountTotal: z.number().nonnegative(),
    subtotal: z.number().nonnegative(),
    total: z.number().nonnegative(),
  })
  .strict();

const orderLineSchema = z
  .object({
    discountPercentage: z.number().min(0).max(100),
    id: z.string().min(1),
    lineDiscount: z.number().nonnegative(),
    lineSubtotal: z.number().nonnegative(),
    lineTotal: z.number().nonnegative(),
    productId: z.string().min(1).nullable(),
    productTitle: z.string().min(1),
    quantity: z.number().int().positive(),
    sku: z.string().nullable(),
    unitPrice: z.number().nonnegative(),
  })
  .strict();

const draftLineSchema = orderLineSchema.extend({
  minimumOrderQuantity: z.number().int().positive(),
  productId: z.string().min(1),
  sku: z.string().min(1),
  thumbnail: z.string().url().nullable(),
});

export const draftSchema = z
  .object({
    customer: customerSchema,
    id: z.string().min(1),
    items: z.array(draftLineSchema),
    sessionId: z.string().min(1),
    status: z.enum(["ACTIVE", "CANCELLED", "CONFIRMED"]),
    totals: totalsSchema,
    version: z.number().int().positive(),
  })
  .strict();

export const addDraftItemInputSchema = z
  .object({ productId: z.string().trim().min(1), quantity: z.number().int().positive() })
  .strict();

export const updateDraftItemInputSchema = z
  .object({ itemId: z.string().trim().min(1), quantity: z.number().int().positive() })
  .strict();

export const draftItemInputSchema = z.object({ itemId: z.string().trim().min(1) }).strict();

export const saveCustomerDataInputSchema = z
  .object({
    address: z.string().trim().min(10).max(500),
    email: z.string().trim().email().max(254).optional(),
    name: z.string().trim().min(1).max(100),
    note: z.string().trim().max(500).optional(),
    whatsapp: z.string().trim().min(7).max(30),
  })
  .strict();

export const draftValidationSchema = z
  .object({
    issues: z.array(
      z
        .object({
          code: z.string().min(1),
          field: z.string().optional(),
          itemId: z.string().optional(),
          message: z.string().min(1),
          productId: z.string().optional(),
        })
        .strict(),
    ),
    valid: z.boolean(),
    version: z.number().int().positive(),
  })
  .strict();

export const orderSummarySchema = z
  .object({
    customer: requiredCustomerSchema,
    draftId: z.string().min(1),
    draftVersion: z.number().int().positive(),
    expiresAt: z.iso.datetime(),
    items: z.array(draftLineSchema).min(1),
    totals: totalsSchema,
  })
  .strict();

export const confirmOrderInputSchema = z
  .object({ draftVersion: z.number().int().positive() })
  .strict();

export const getOrderInputSchema = z
  .object({ orderNumber: z.string().trim().min(1).max(64) })
  .strict();

export const orderSchema = z
  .object({
    createdAt: z.iso.datetime(),
    customer: requiredCustomerSchema,
    id: z.string().min(1),
    items: z.array(orderLineSchema).min(1),
    orderNumber: z.string().min(1),
    status: z.literal("CONFIRMED"),
    totals: totalsSchema,
  })
  .strict();

export const apiErrorCodeSchema = z.enum([
  "CONFIRMATION_REQUIRED",
  "CUSTOMER_DATA_INCOMPLETE",
  "DRAFT_NOT_FOUND",
  "DRAFT_VERSION_CONFLICT",
  "IDEMPOTENCY_CONFLICT",
  "INSUFFICIENT_STOCK",
  "INTERNAL_ERROR",
  "INVALID_REQUEST",
  "MINIMUM_ORDER_NOT_MET",
  "ORDER_NOT_FOUND",
  "PRODUCT_NOT_FOUND",
  "PRODUCT_NOT_ORDERABLE",
  "PRODUCT_OUT_OF_STOCK",
  "SESSION_NOT_FOUND",
]);

export const toolErrorSchema = z
  .object({
    code: apiErrorCodeSchema,
    details: z.record(z.string(), z.unknown()).optional(),
    message: z.string().min(1),
    retryable: z.boolean(),
  })
  .strict();

export function toolResultSchema<DataSchema extends z.ZodType>(data: DataSchema) {
  return z.discriminatedUnion("ok", [
    z.object({ data, ok: z.literal(true) }).strict(),
    z.object({ error: toolErrorSchema, ok: z.literal(false) }).strict(),
  ]);
}

export type SearchProductsInput = z.output<typeof searchProductsInputSchema>;
export type AvailabilityInput = z.output<typeof availabilityInputSchema>;
export type RecommendationInput = z.output<typeof recommendationInputSchema>;
export type RankingInput = z.output<typeof rankingInputSchema>;
export type AddDraftItemInput = z.output<typeof addDraftItemInputSchema>;
export type UpdateDraftItemInput = z.output<typeof updateDraftItemInputSchema>;
export type SaveCustomerDataInput = z.output<typeof saveCustomerDataInputSchema>;
