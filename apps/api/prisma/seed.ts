import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { databaseConfig } from "@repo/config";
import { z } from "zod";

const productFixtureSchema = z.object({
  products: z.array(
    z.object({
      id: z.number().int().positive(),
      title: z.string().min(1),
      description: z.string(),
      price: z.number().nonnegative(),
      discountPercentage: z.number().min(0).max(100),
      rating: z.number().min(0).max(5),
      stock: z.number().int().nonnegative(),
      brand: z.string().nullable().optional(),
      category: z.string().min(1),
      thumbnail: z.string().url(),
      images: z.array(z.string().url()),
      tags: z.array(z.string().min(1)).optional(),
      sku: z.string().min(1),
      minimumOrderQuantity: z.number().int().positive(),
    }),
  ),
});

const userFixtureSchema = z.object({
  users: z.array(
    z.object({
      id: z.number().int().positive(),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().min(1),
      address: z.object({
        address: z.string().min(1),
        city: z.string().min(1),
        state: z.string().min(1),
        postalCode: z.string().min(1),
        country: z.string().min(1).optional(),
      }),
      image: z.string().url(),
    }),
  ),
});

const cartFixtureSchema = z.object({
  carts: z.array(
    z.object({
      id: z.number().int().positive(),
      userId: z.number().int().positive(),
      products: z.array(
        z.object({
          id: z.number().int().positive(),
          title: z.string().min(1),
          price: z.number().nonnegative(),
          quantity: z.number().int().positive(),
          total: z.number().nonnegative(),
          discountPercentage: z.number().min(0).max(100),
          discountedTotal: z.number().nonnegative(),
        }),
      ),
      total: z.number().nonnegative(),
      discountedTotal: z.number().nonnegative(),
    }),
  ),
});

const seedDirectory = fileURLToPath(new URL("./seed-data/", import.meta.url));
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseConfig.url }),
});

async function readFixture(fileName: string): Promise<unknown> {
  return JSON.parse(await readFile(`${seedDirectory}${fileName}`, "utf8"));
}

async function seed() {
  const productsFixture = productFixtureSchema.parse(await readFixture("products.json"));
  const usersFixture = userFixtureSchema.parse(await readFixture("users.json"));
  const cartsFixture = cartFixtureSchema.parse(await readFixture("carts.json"));

  await prisma.storeProfile.upsert({
    where: { id: "default" },
    update: {
      currency: "USD",
      locale: "en-US",
      name: "Devscale Reseller Store",
      orderPolicy: "Orders are final only after an explicit confirmation of the latest summary.",
      shippingPolicy: "Shipping timing and cost are confirmed by the reseller after checkout.",
    },
    create: {
      id: "default",
      currency: "USD",
      locale: "en-US",
      name: "Devscale Reseller Store",
      orderPolicy: "Orders are final only after an explicit confirmation of the latest summary.",
      shippingPolicy: "Shipping timing and cost are confirmed by the reseller after checkout.",
    },
  });

  for (const product of productsFixture.products) {
    const category = await prisma.category.upsert({
      where: { slug: product.category },
      update: { name: product.category },
      create: { slug: product.category, name: product.category },
    });
    const isOrderable = product.stock > 0 && product.stock >= product.minimumOrderQuantity;
    const data = {
      brand: product.brand ?? null,
      categoryId: category.id,
      description: product.description,
      discountPercentage: product.discountPercentage,
      images: product.images,
      isOrderable,
      minimumOrderQuantity: product.minimumOrderQuantity,
      price: product.price,
      rating: product.rating,
      sku: product.sku,
      stock: product.stock,
      tags: product.tags ?? [],
      thumbnail: product.thumbnail,
      title: product.title,
    };

    await prisma.product.upsert({
      where: { sourceId: product.id },
      update: data,
      create: { ...data, sourceId: product.id },
    });
  }

  for (const user of usersFixture.users) {
    const address = [
      user.address.address,
      user.address.city,
      user.address.state,
      user.address.postalCode,
      user.address.country,
    ]
      .filter(Boolean)
      .join(", ");

    await prisma.customer.upsert({
      where: { sourceId: user.id },
      update: {
        address,
        email: user.email,
        image: user.image,
        name: `${user.firstName} ${user.lastName}`,
        phone: user.phone,
      },
      create: {
        address,
        email: user.email,
        image: user.image,
        name: `${user.firstName} ${user.lastName}`,
        phone: user.phone,
        sourceId: user.id,
      },
    });
  }

  const products = await prisma.product.findMany();
  const customers = await prisma.customer.findMany({ where: { sourceId: { not: null } } });
  const productsBySourceId = new Map(products.map((product) => [product.sourceId, product]));
  const customersBySourceId = new Map(
    customers.flatMap((customer) =>
      customer.sourceId === null ? [] : [[customer.sourceId, customer] as const],
    ),
  );

  for (const cart of cartsFixture.carts) {
    const customer = customersBySourceId.get(cart.userId);
    const items = cart.products.map((item) => {
      const product = productsBySourceId.get(item.id);
      return {
        discountPercentage: item.discountPercentage,
        lineDiscount: item.total - item.discountedTotal,
        lineSubtotal: item.total,
        lineTotal: item.discountedTotal,
        productId: product?.id,
        productTitle: item.title,
        quantity: item.quantity,
        sku: product?.sku,
        sourceProductId: item.id,
        unitPrice: item.price,
      };
    });
    const orderData = {
      currency: "USD",
      customerAddress: customer?.address ?? "Unavailable (historical import)",
      customerEmail: customer?.email,
      customerId: customer?.id,
      customerName: customer?.name ?? `Historical customer ${cart.userId}`,
      customerWhatsapp: customer?.phone ?? "Unavailable",
      discountTotal: cart.total - cart.discountedTotal,
      orderNumber: `HIST-${String(cart.id).padStart(6, "0")}`,
      source: "HISTORICAL" as const,
      subtotal: cart.total,
      total: cart.discountedTotal,
    };

    await prisma.order.upsert({
      where: { sourceId: cart.id },
      update: {
        ...orderData,
        items: { deleteMany: {}, create: items },
      },
      create: {
        ...orderData,
        sourceId: cart.id,
        items: { create: items },
      },
    });
  }

  const [productCount, customerCount, historicalOrderCount] = await Promise.all([
    prisma.product.count(),
    prisma.customer.count({ where: { sourceId: { not: null } } }),
    prisma.order.count({ where: { source: "HISTORICAL" } }),
  ]);

  console.log(
    `Seed complete: ${productCount} products, ${customerCount} customers, ${historicalOrderCount} historical orders.`,
  );
}

seed()
  .catch((error) => {
    console.error("Seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
