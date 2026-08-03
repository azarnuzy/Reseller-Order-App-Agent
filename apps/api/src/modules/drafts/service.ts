import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient, type Product } from "@prisma/client";
import { HttpError } from "../../http-error";
import { prisma } from "../../prisma";
import { requireOwnedChatSession } from "../chat-sessions/service";
import type { AddDraftItemInput, SaveCustomerDataInput } from "./schema";
import type { DraftValidationIssue } from "./types";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;
const grantLifetimeMilliseconds = 5 * 60 * 1000;
const draftInclude = {
  items: {
    include: {
      product: { select: { thumbnail: true } },
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.DraftOrderInclude;

export async function getActiveDraft(sessionId: string, userId: string) {
  await requireOwnedChatSession(prisma, sessionId, userId);
  const draft = await prisma.draftOrder.findFirst({
    include: draftInclude,
    where: { chatSessionId: sessionId, status: "ACTIVE" },
  });
  return draft ? draftResponse(draft) : null;
}

export async function addDraftItem(sessionId: string, userId: string, input: AddDraftItemInput) {
  return prisma.$transaction(async (transaction) => {
    await requireOwnedChatSession(transaction, sessionId, userId);
    let draft = await transaction.draftOrder.findFirst({
      where: { activeKey: sessionId, status: "ACTIVE" },
    });
    if (!draft) {
      const store = await transaction.storeProfile.findUnique({ where: { id: "default" } });
      if (!store) throw new HttpError(500, "INTERNAL_ERROR", "Store profile is not configured.");
      draft = await transaction.draftOrder.create({
        data: { activeKey: sessionId, chatSessionId: sessionId, currency: store.currency },
      });
    }
    const product = await requireProduct(transaction, input.productId);
    assertProductQuantity(product, input.quantity);
    const totals = lineTotals(product, input.quantity);

    await transaction.draftOrderItem.upsert({
      where: { draftId_productId: { draftId: draft.id, productId: product.id } },
      update: {
        discountPercentage: product.discountPercentage,
        lineDiscount: totals.lineDiscount,
        lineSubtotal: totals.lineSubtotal,
        lineTotal: totals.lineTotal,
        minimumOrderQuantity: product.minimumOrderQuantity,
        productTitle: product.title,
        quantity: input.quantity,
        sku: product.sku,
        unitPrice: product.price,
      },
      create: {
        discountPercentage: product.discountPercentage,
        draftId: draft.id,
        lineDiscount: totals.lineDiscount,
        lineSubtotal: totals.lineSubtotal,
        lineTotal: totals.lineTotal,
        minimumOrderQuantity: product.minimumOrderQuantity,
        productId: product.id,
        productTitle: product.title,
        quantity: input.quantity,
        sku: product.sku,
        unitPrice: product.price,
      },
    });

    return draftResponse(await recalculateDraft(transaction, draft.id));
  });
}

export async function updateDraftItem(
  sessionId: string,
  userId: string,
  itemId: string,
  quantity: number,
) {
  return prisma.$transaction(async (transaction) => {
    const draft = await requireActiveDraft(transaction, sessionId, userId);
    const item = await transaction.draftOrderItem.findFirst({
      include: { product: true },
      where: { draftId: draft.id, id: itemId },
    });
    if (!item) throw new HttpError(404, "DRAFT_NOT_FOUND", "Draft item was not found.");
    assertProductQuantity(item.product, quantity);
    const totals = lineTotals(item.product, quantity);
    await transaction.draftOrderItem.update({
      where: { id: item.id },
      data: {
        discountPercentage: item.product.discountPercentage,
        lineDiscount: totals.lineDiscount,
        lineSubtotal: totals.lineSubtotal,
        lineTotal: totals.lineTotal,
        minimumOrderQuantity: item.product.minimumOrderQuantity,
        productTitle: item.product.title,
        quantity,
        sku: item.product.sku,
        unitPrice: item.product.price,
      },
    });
    return draftResponse(await recalculateDraft(transaction, draft.id));
  });
}

export async function removeDraftItem(sessionId: string, userId: string, itemId: string) {
  return prisma.$transaction(async (transaction) => {
    const draft = await requireActiveDraft(transaction, sessionId, userId);
    const deleted = await transaction.draftOrderItem.deleteMany({
      where: { draftId: draft.id, id: itemId },
    });
    if (deleted.count === 0)
      throw new HttpError(404, "DRAFT_NOT_FOUND", "Draft item was not found.");
    return draftResponse(await recalculateDraft(transaction, draft.id));
  });
}

export async function saveCustomerData(
  sessionId: string,
  userId: string,
  input: SaveCustomerDataInput,
) {
  return prisma.$transaction(async (transaction) => {
    const draft = await requireActiveDraft(transaction, sessionId, userId);
    const whatsapp = normalizeWhatsapp(input.whatsapp);
    await transaction.customer.upsert({
      where: { userId },
      update: {
        address: input.address,
        email: input.email ?? null,
        name: input.name,
        phone: whatsapp,
      },
      create: {
        address: input.address,
        email: input.email,
        name: input.name,
        phone: whatsapp,
        userId,
      },
    });
    const updated = await transaction.draftOrder.update({
      include: draftInclude,
      where: { id: draft.id },
      data: {
        customerAddress: input.address,
        customerEmail: input.email ?? null,
        customerName: input.name,
        customerNote: input.note ?? null,
        customerWhatsapp: whatsapp,
        version: { increment: 1 },
      },
    });
    return draftResponse(updated);
  });
}

export async function getLatestCustomerData(sessionId: string, userId: string) {
  await requireOwnedChatSession(prisma, sessionId, userId);
  const order = await prisma.order.findFirst({
    orderBy: { createdAt: "desc" },
    select: {
      customerAddress: true,
      customerEmail: true,
      customerName: true,
      customerNote: true,
      customerWhatsapp: true,
    },
    where: { chatSessionId: sessionId, status: "CONFIRMED", userId },
  });
  return order
    ? {
        address: order.customerAddress,
        email: order.customerEmail,
        name: order.customerName,
        note: order.customerNote,
        whatsapp: order.customerWhatsapp,
      }
    : null;
}

export async function validateDraft(sessionId: string, userId: string) {
  const draft = await requireActiveDraft(prisma, sessionId, userId);
  const issues = validateLoadedDraft(draft);
  return { issues, valid: issues.length === 0, version: draft.version };
}

export async function getOrderSummary(sessionId: string, userId: string) {
  return prisma.$transaction(async (transaction) => {
    let draft = await requireActiveDraft(transaction, sessionId, userId);
    const issues = validateLoadedDraft(draft);
    if (issues.length > 0) throw validationError(issues);

    let changed = false;
    for (const item of draft.items) {
      const current = lineTotals(item.product, item.quantity);
      const itemChanged =
        !item.unitPrice.equals(item.product.price) ||
        !item.discountPercentage.equals(item.product.discountPercentage) ||
        !item.lineSubtotal.equals(current.lineSubtotal) ||
        !item.lineDiscount.equals(current.lineDiscount) ||
        !item.lineTotal.equals(current.lineTotal) ||
        item.minimumOrderQuantity !== item.product.minimumOrderQuantity ||
        item.productTitle !== item.product.title ||
        item.sku !== item.product.sku;
      if (!itemChanged) continue;
      changed = true;
      await transaction.draftOrderItem.update({
        where: { id: item.id },
        data: {
          discountPercentage: item.product.discountPercentage,
          lineDiscount: current.lineDiscount,
          lineSubtotal: current.lineSubtotal,
          lineTotal: current.lineTotal,
          minimumOrderQuantity: item.product.minimumOrderQuantity,
          productTitle: item.product.title,
          sku: item.product.sku,
          unitPrice: item.product.price,
        },
      });
    }
    const totals = sumTotals(draft.items.map((item) => lineTotals(item.product, item.quantity)));
    if (
      changed ||
      !draft.subtotal.equals(totals.subtotal) ||
      !draft.discountTotal.equals(totals.discountTotal) ||
      !draft.total.equals(totals.total)
    ) {
      await transaction.draftOrder.update({
        where: { id: draft.id },
        data: { ...totals, version: { increment: 1 } },
      });
      draft = await requireActiveDraft(transaction, sessionId, userId);
    }
    const expiresAt = new Date(Date.now() + grantLifetimeMilliseconds);
    await transaction.confirmationGrant.upsert({
      where: { draftId_draftVersion: { draftId: draft.id, draftVersion: draft.version } },
      update: { expiresAt },
      create: {
        draftId: draft.id,
        draftVersion: draft.version,
        expiresAt,
        idempotencyKey: randomUUID(),
      },
    });
    return {
      customer: {
        address: draft.customerAddress,
        email: draft.customerEmail,
        name: draft.customerName,
        note: draft.customerNote,
        whatsapp: draft.customerWhatsapp,
      },
      draftId: draft.id,
      draftVersion: draft.version,
      expiresAt,
      items: draft.items.map(draftItemResponse),
      totals: monetaryTotals(draft),
    };
  });
}

export async function cancelDraft(sessionId: string, userId: string) {
  return prisma.$transaction(async (transaction) => {
    const draft = await requireActiveDraft(transaction, sessionId, userId);
    const now = new Date();
    await transaction.confirmationGrant.updateMany({
      where: { consumedAt: null, draftId: draft.id },
      data: { consumedAt: now },
    });
    const cancelled = await transaction.draftOrder.update({
      include: draftInclude,
      where: { id: draft.id },
      data: { activeKey: null, status: "CANCELLED", version: { increment: 1 } },
    });
    return draftResponse(cancelled);
  });
}

export async function requireActiveDraft(
  database: DatabaseClient,
  sessionId: string,
  userId: string,
) {
  await requireOwnedChatSession(database, sessionId, userId);
  const draft = await database.draftOrder.findFirst({
    include: { items: { include: { product: true }, orderBy: { createdAt: "asc" } } },
    where: { activeKey: sessionId, chatSessionId: sessionId, status: "ACTIVE" },
  });
  if (!draft) throw new HttpError(404, "DRAFT_NOT_FOUND", "Active draft was not found.");
  return draft;
}

function validateLoadedDraft(
  draft: Awaited<ReturnType<typeof requireActiveDraft>> & {
    items: Array<{ id: string; productId: string; quantity: number; product: Product }>;
  },
): DraftValidationIssue[] {
  const issues: DraftValidationIssue[] = [];
  if (draft.items.length === 0) {
    issues.push({ code: "DRAFT_NOT_FOUND", message: "The draft has no items." });
  }
  for (const item of draft.items) {
    try {
      assertProductQuantity(item.product, item.quantity);
    } catch (error) {
      if (error instanceof HttpError) {
        issues.push({
          code: error.code,
          itemId: item.id,
          message: error.message,
          productId: item.productId,
        });
      } else throw error;
    }
  }
  const requiredFields: Array<[string, string | null]> = [
    ["name", draft.customerName],
    ["whatsapp", draft.customerWhatsapp],
    ["address", draft.customerAddress],
  ];
  const missingFields = requiredFields.filter(([, value]) => !value);
  for (const [field] of missingFields) {
    issues.push({ code: "CUSTOMER_DATA_INCOMPLETE", field, message: `${field} is required.` });
  }
  return issues;
}

function validationError(issues: DraftValidationIssue[]) {
  const first = issues[0];
  const code =
    first?.code === "CUSTOMER_DATA_INCOMPLETE" ? "CUSTOMER_DATA_INCOMPLETE" : first?.code;
  if (code === "CUSTOMER_DATA_INCOMPLETE") {
    return new HttpError(422, code, "Recipient data is incomplete.", {
      issues,
      missingFields: issues.filter((issue) => issue.field).map((issue) => issue.field),
    });
  }
  if (code === "DRAFT_NOT_FOUND")
    return new HttpError(422, "DRAFT_NOT_FOUND", "The draft has no items.", { issues });
  return new HttpError(
    409,
    (code as "PRODUCT_OUT_OF_STOCK") ?? "PRODUCT_NOT_ORDERABLE",
    first?.message ?? "Draft validation failed.",
    { issues },
  );
}

async function requireProduct(database: DatabaseClient, productId: string) {
  const product = await database.product.findUnique({ where: { id: productId } });
  if (!product)
    throw new HttpError(404, "PRODUCT_NOT_FOUND", "Product was not found.", { productId });
  return product;
}

function assertProductQuantity(product: Product, quantity: number) {
  const details = {
    minimumOrderQuantity: product.minimumOrderQuantity,
    productId: product.id,
    quantity,
    stock: product.stock,
  };
  if (product.stock === 0) {
    throw new HttpError(409, "PRODUCT_OUT_OF_STOCK", "Product is out of stock.", details);
  }
  if (quantity < product.minimumOrderQuantity) {
    throw new HttpError(
      422,
      "MINIMUM_ORDER_NOT_MET",
      "Quantity is below the minimum order.",
      details,
    );
  }
  if (quantity > product.stock) {
    throw new HttpError(
      409,
      "INSUFFICIENT_STOCK",
      "Requested quantity exceeds current stock.",
      details,
    );
  }
  if (!product.isOrderable) {
    throw new HttpError(
      409,
      "PRODUCT_NOT_ORDERABLE",
      "Product is not currently orderable.",
      details,
    );
  }
}

function lineTotals(product: Pick<Product, "discountPercentage" | "price">, quantity: number) {
  const lineSubtotal = product.price.mul(quantity).toDecimalPlaces(2);
  const lineDiscount = lineSubtotal.mul(product.discountPercentage).div(100).toDecimalPlaces(2);
  return { lineDiscount, lineSubtotal, lineTotal: lineSubtotal.sub(lineDiscount) };
}

function sumTotals(lines: Array<ReturnType<typeof lineTotals>>) {
  return lines.reduce(
    (totals, line) => ({
      discountTotal: totals.discountTotal.add(line.lineDiscount),
      subtotal: totals.subtotal.add(line.lineSubtotal),
      total: totals.total.add(line.lineTotal),
    }),
    {
      discountTotal: new Prisma.Decimal(0),
      subtotal: new Prisma.Decimal(0),
      total: new Prisma.Decimal(0),
    },
  );
}

async function recalculateDraft(database: DatabaseClient, draftId: string) {
  const items = await database.draftOrderItem.findMany({ where: { draftId } });
  const totals = sumTotals(
    items.map((item) => ({
      lineDiscount: item.lineDiscount,
      lineSubtotal: item.lineSubtotal,
      lineTotal: item.lineTotal,
    })),
  );
  return database.draftOrder.update({
    include: draftInclude,
    where: { id: draftId },
    data: { ...totals, version: { increment: 1 } },
  });
}

function draftResponse(draft: Prisma.DraftOrderGetPayload<{ include: typeof draftInclude }>) {
  return {
    customer: {
      address: draft.customerAddress,
      email: draft.customerEmail,
      name: draft.customerName,
      note: draft.customerNote,
      whatsapp: draft.customerWhatsapp,
    },
    id: draft.id,
    items: draft.items.map(draftItemResponse),
    sessionId: draft.chatSessionId,
    status: draft.status,
    totals: monetaryTotals(draft),
    version: draft.version,
  };
}

function draftItemResponse(item: {
  id: string;
  productId: string;
  productTitle: string;
  sku: string;
  unitPrice: Prisma.Decimal;
  discountPercentage: Prisma.Decimal;
  quantity: number;
  minimumOrderQuantity: number;
  lineSubtotal: Prisma.Decimal;
  lineDiscount: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  product?: { thumbnail: string };
}) {
  return {
    discountPercentage: Number(item.discountPercentage),
    id: item.id,
    lineDiscount: Number(item.lineDiscount),
    lineSubtotal: Number(item.lineSubtotal),
    lineTotal: Number(item.lineTotal),
    minimumOrderQuantity: item.minimumOrderQuantity,
    productId: item.productId,
    productTitle: item.productTitle,
    quantity: item.quantity,
    sku: item.sku,
    thumbnail: item.product?.thumbnail ?? null,
    unitPrice: Number(item.unitPrice),
  };
}

function monetaryTotals(draft: {
  currency: string;
  discountTotal: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  total: Prisma.Decimal;
}) {
  return {
    currency: draft.currency,
    discountTotal: Number(draft.discountTotal),
    subtotal: Number(draft.subtotal),
    total: Number(draft.total),
  };
}

function normalizeWhatsapp(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}
