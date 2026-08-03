import type { Prisma, Product } from "@prisma/client";
import { HttpError } from "../../http-error";
import { prisma } from "../../prisma";
import type { ProductSearchQuery, RankingQuery, RecommendationQuery } from "./schema";
import type { AvailabilityStatus, ProductResponse } from "./types";

type ProductWithCategory = Product & { category: { slug: string } };

export function productResponse(product: ProductWithCategory): ProductResponse {
  const price = Number(product.price);
  const discountPercentage = Number(product.discountPercentage);

  return {
    brand: product.brand,
    category: product.category.slug,
    description: product.description,
    discountedPrice: roundMoney(price * (1 - discountPercentage / 100)),
    discountPercentage,
    id: product.id,
    images: stringArray(product.images),
    isOrderable: product.isOrderable,
    minimumOrderQuantity: product.minimumOrderQuantity,
    price,
    rating: Number(product.rating),
    sku: product.sku,
    sourceId: product.sourceId,
    stock: product.stock,
    tags: stringArray(product.tags),
    thumbnail: product.thumbnail,
    title: product.title,
  };
}

export async function searchProducts(query: ProductSearchQuery) {
  const orderable = query.orderable ?? query.orderableOnly;
  const where: Prisma.ProductWhereInput = {
    ...(query.category ? { category: { slug: query.category } } : {}),
    ...(query.inStock === undefined ? {} : { stock: query.inStock ? { gt: 0 } : { equals: 0 } }),
    ...(orderable === undefined ? {} : { isOrderable: orderable }),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined
      ? {
          price: {
            ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
            ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
          },
        }
      : {}),
    ...(query.q
      ? {
          OR: ["title", "description", "brand", "sku"].map((field) => ({
            [field]: { contains: query.q, mode: "insensitive" },
          })),
        }
      : {}),
  };
  const orderBy = productOrder(query.sort);
  const products = await prisma.product.findMany({
    cursor: query.cursor ? { id: query.cursor } : undefined,
    include: { category: { select: { slug: true } } },
    orderBy,
    skip: query.cursor ? 1 : 0,
    take: query.limit + 1,
    where,
  });
  const hasMore = products.length > query.limit;
  const page = products.slice(0, query.limit);

  return {
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    products: page.map(productResponse),
  };
}

export async function getProductDetail(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: { select: { slug: true } } },
  });
  if (!product) {
    throw new HttpError(404, "PRODUCT_NOT_FOUND", "Product was not found.", { productId });
  }
  return productResponse(product);
}

export async function checkProductAvailability(productId: string, quantity?: number) {
  const product = await getProductDetail(productId);
  let status: AvailabilityStatus = "AVAILABLE";

  if (product.stock === 0) status = "OUT_OF_STOCK";
  else if (!product.isOrderable && product.stock < product.minimumOrderQuantity) {
    status = "BELOW_MINIMUM_ORDER";
  } else if (!product.isOrderable) status = "PRODUCT_NOT_ORDERABLE";
  else if (quantity !== undefined && quantity < product.minimumOrderQuantity) {
    status = "BELOW_MINIMUM_ORDER";
  } else if (quantity !== undefined && quantity > product.stock) status = "INSUFFICIENT_STOCK";

  return {
    canFulfill: status === "AVAILABLE",
    minimumOrderQuantity: product.minimumOrderQuantity,
    productId: product.id,
    quantity: quantity ?? null,
    status,
    stock: product.stock,
  };
}

export async function recommendProducts(query: RecommendationQuery) {
  const excludedIds = new Set(query.excludeProductIds ?? []);
  const requiredTags = (query.tags ?? []).map((tag) => tag.toLowerCase());
  const candidates = await prisma.product.findMany({
    include: { category: { select: { slug: true } } },
    orderBy: [{ rating: "desc" }, { price: "asc" }, { id: "asc" }],
    where: {
      id: excludedIds.size ? { notIn: [...excludedIds] } : undefined,
      isOrderable: true,
      stock: { gt: 0 },
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.maxPrice !== undefined ? { price: { lte: query.maxPrice } } : {}),
    },
  });
  const products = candidates
    .filter((product) => {
      if (requiredTags.length === 0) return true;
      const tags = stringArray(product.tags).map((tag) => tag.toLowerCase());
      return requiredTags.every((tag) => tags.includes(tag));
    })
    .slice(0, query.limit)
    .map(productResponse);

  return {
    appliedCriteria: {
      category: query.category ?? null,
      excludeProductIds: [...excludedIds],
      maxPrice: query.maxPrice ?? null,
      tags: query.tags ?? [],
    },
    products,
  };
}

export async function getTopProducts(query: RankingQuery) {
  const products = await prisma.product.findMany({
    include: { category: { select: { slug: true } } },
    where: { isOrderable: true, stock: { gt: 0 } },
  });
  const ids = products.map((product) => product.id);
  const orderItems = await prisma.orderItem.findMany({
    select: { orderId: true, productId: true, quantity: true },
    where: { productId: { in: ids } },
  });
  const metrics = new Map<string, { orderIds: Set<string>; unitsSold: number }>();
  for (const item of orderItems) {
    if (!item.productId) continue;
    const metric = metrics.get(item.productId) ?? { orderIds: new Set<string>(), unitsSold: 0 };
    metric.orderIds.add(item.orderId);
    metric.unitsSold += item.quantity;
    metrics.set(item.productId, metric);
  }
  const ranked = products
    .map((product) => ({
      orderCount: metrics.get(product.id)?.orderIds.size ?? 0,
      product,
      unitsSold: metrics.get(product.id)?.unitsSold ?? 0,
    }))
    .sort((left, right) => {
      const primary =
        query.ranking === "BEST_SELLING"
          ? right.unitsSold - left.unitsSold
          : query.ranking === "MOST_POPULAR"
            ? right.orderCount - left.orderCount
            : Number(right.product.rating) - Number(left.product.rating);
      return (
        primary ||
        Number(left.product.price) - Number(right.product.price) ||
        left.product.id.localeCompare(right.product.id)
      );
    })
    .slice(0, query.limit);

  return {
    products: ranked.map((item, index) => ({
      orderCount: item.orderCount,
      product: productResponse(item.product),
      rank: index + 1,
      unitsSold: item.unitsSold,
    })),
    ranking: query.ranking,
  };
}

export async function listCategories() {
  const categories = await prisma.category.findMany({
    orderBy: { slug: "asc" },
    select: { name: true, slug: true, _count: { select: { products: true } } },
  });
  return categories.map(({ _count, ...category }) => ({
    ...category,
    productCount: _count.products,
  }));
}

function productOrder(sort: ProductSearchQuery["sort"]): Prisma.ProductOrderByWithRelationInput[] {
  if (sort === "PRICE_ASC") return [{ price: "asc" }, { id: "asc" }];
  if (sort === "PRICE_DESC") return [{ price: "desc" }, { id: "asc" }];
  if (sort === "RATING_DESC") return [{ rating: "desc" }, { id: "asc" }];
  return [{ title: "asc" }, { id: "asc" }];
}

function stringArray(value: Prisma.JsonValue): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
