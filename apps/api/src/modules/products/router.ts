import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { invalidRequest } from "../../request-validation";
import {
  availabilityQuerySchema,
  productIdParamsSchema,
  productSearchQuerySchema,
  rankingQuerySchema,
  recommendationQuerySchema,
} from "./schema";
import {
  checkProductAvailability,
  getProductDetail,
  getTopProducts,
  listCategories,
  recommendProducts,
  searchProducts,
} from "./service";

export const productsRouter = new Hono()
  .get("/products", zValidator("query", productSearchQuerySchema, invalidRequest), async (c) => {
    return c.json(await searchProducts(c.req.valid("query")), 200);
  })
  .get(
    "/products/:productId/availability",
    zValidator("param", productIdParamsSchema, invalidRequest),
    zValidator("query", availabilityQuerySchema, invalidRequest),
    async (c) => {
      const { productId } = c.req.valid("param");
      const { quantity } = c.req.valid("query");
      return c.json({ availability: await checkProductAvailability(productId, quantity) }, 200);
    },
  )
  .get(
    "/products/:productId",
    zValidator("param", productIdParamsSchema, invalidRequest),
    async (c) => {
      return c.json({ product: await getProductDetail(c.req.valid("param").productId) }, 200);
    },
  )
  .get(
    "/product-recommendations",
    zValidator("query", recommendationQuerySchema, invalidRequest),
    async (c) => {
      return c.json(await recommendProducts(c.req.valid("query")), 200);
    },
  )
  .get("/product-rankings", zValidator("query", rankingQuerySchema, invalidRequest), async (c) => {
    return c.json(await getTopProducts(c.req.valid("query")), 200);
  })
  .get("/categories", async (c) => {
    return c.json({ categories: await listCategories() }, 200);
  });
