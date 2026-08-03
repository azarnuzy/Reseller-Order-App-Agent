import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { HttpError } from "../../http-error";
import { prisma } from "../../prisma";
import { requireOwnedChatSession } from "../chat-sessions/service";
import type { ConfirmOrderResult } from "./types";

const orderInclude = {
  items: { orderBy: { id: "asc" } },
} satisfies Prisma.OrderInclude;

export async function confirmOrder(
  sessionId: string,
  userId: string,
  draftVersion: number,
): Promise<ConfirmOrderResult> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          await requireOwnedChatSession(transaction, sessionId, userId);
          const draft = await transaction.draftOrder.findFirst({
            include: { items: { include: { product: true }, orderBy: { createdAt: "asc" } } },
            where: { chatSessionId: sessionId, version: draftVersion },
          });
          if (!draft) {
            const activeDraft = await transaction.draftOrder.findFirst({
              select: { version: true },
              where: { activeKey: sessionId, status: "ACTIVE" },
            });
            if (activeDraft) {
              throw new HttpError(
                409,
                "DRAFT_VERSION_CONFLICT",
                "The draft changed after the summarized version.",
                { currentVersion: activeDraft.version, draftVersion },
              );
            }
            throw new HttpError(404, "DRAFT_NOT_FOUND", "Draft was not found.");
          }
          const grant = await transaction.confirmationGrant.findUnique({
            where: { draftId_draftVersion: { draftId: draft.id, draftVersion } },
          });
          if (!grant) {
            throw new HttpError(
              409,
              "CONFIRMATION_REQUIRED",
              "Review the latest order summary before confirming.",
            );
          }
          const requestHash = confirmationHash(sessionId, userId, draft.id, draftVersion);
          const priorRecord = await transaction.idempotencyRecord.findUnique({
            include: { order: { include: orderInclude } },
            where: { key: grant.idempotencyKey },
          });
          if (priorRecord) {
            if (priorRecord.requestHash !== requestHash) {
              throw new HttpError(
                409,
                "IDEMPOTENCY_CONFLICT",
                "The confirmation retry does not match the original request.",
              );
            }
            return { idempotent: true, order: orderResponse(priorRecord.order) };
          }
          if (draft.status !== "ACTIVE" || grant.consumedAt || grant.expiresAt <= new Date()) {
            throw new HttpError(
              grant.expiresAt <= new Date() ? 410 : 409,
              "CONFIRMATION_REQUIRED",
              "The confirmation expired or is no longer valid. Review a fresh summary.",
            );
          }
          if (!draft.customerName || !draft.customerWhatsapp || !draft.customerAddress) {
            throw new HttpError(
              422,
              "CUSTOMER_DATA_INCOMPLETE",
              "Recipient name, WhatsApp, and complete address are required.",
            );
          }
          if (draft.items.length === 0) {
            throw new HttpError(422, "DRAFT_NOT_FOUND", "The draft has no items.");
          }

          const lines: Array<{
            item: (typeof draft.items)[number];
            lineDiscount: Prisma.Decimal;
            lineSubtotal: Prisma.Decimal;
            lineTotal: Prisma.Decimal;
          }> = [];
          for (const item of draft.items) {
            const product = item.product;
            assertProductQuantity(product, item.quantity);
            if (
              !item.unitPrice.equals(product.price) ||
              !item.discountPercentage.equals(product.discountPercentage) ||
              item.minimumOrderQuantity !== product.minimumOrderQuantity ||
              item.productTitle !== product.title ||
              item.sku !== product.sku
            ) {
              throw new HttpError(
                409,
                "DRAFT_VERSION_CONFLICT",
                "Catalog details changed after the order summary. Review a fresh summary.",
                { draftVersion, productId: product.id },
              );
            }
            const lineSubtotal = product.price.mul(item.quantity).toDecimalPlaces(2);
            const lineDiscount = lineSubtotal
              .mul(product.discountPercentage)
              .div(100)
              .toDecimalPlaces(2);
            lines.push({
              item,
              lineDiscount,
              lineSubtotal,
              lineTotal: lineSubtotal.sub(lineDiscount),
            });
          }
          const totals = lines.reduce(
            (sum, line) => ({
              discountTotal: sum.discountTotal.add(line.lineDiscount),
              subtotal: sum.subtotal.add(line.lineSubtotal),
              total: sum.total.add(line.lineTotal),
            }),
            {
              discountTotal: new Prisma.Decimal(0),
              subtotal: new Prisma.Decimal(0),
              total: new Prisma.Decimal(0),
            },
          );
          if (
            !draft.subtotal.equals(totals.subtotal) ||
            !draft.discountTotal.equals(totals.discountTotal) ||
            !draft.total.equals(totals.total)
          ) {
            throw new HttpError(
              409,
              "DRAFT_VERSION_CONFLICT",
              "Draft totals changed after the order summary. Review a fresh summary.",
              { draftVersion },
            );
          }

          for (const line of lines) {
            const product = line.item.product;
            const decremented = await transaction.product.updateMany({
              where: {
                id: product.id,
                isOrderable: true,
                stock: { gte: line.item.quantity },
              },
              data: {
                isOrderable: product.stock - line.item.quantity >= product.minimumOrderQuantity,
                stock: { decrement: line.item.quantity },
              },
            });
            if (decremented.count !== 1) {
              throw new HttpError(
                409,
                "INSUFFICIENT_STOCK",
                "Stock changed while the order was being confirmed.",
                { productId: product.id },
              );
            }
          }

          const customer = await transaction.customer.findUnique({ where: { userId } });
          const order = await transaction.order.create({
            include: orderInclude,
            data: {
              chatSessionId: sessionId,
              currency: draft.currency,
              customerAddress: draft.customerAddress,
              customerEmail: draft.customerEmail,
              customerId: customer?.id,
              customerName: draft.customerName,
              customerNote: draft.customerNote,
              customerWhatsapp: draft.customerWhatsapp,
              discountTotal: totals.discountTotal,
              draftId: draft.id,
              orderNumber: createOrderNumber(),
              source: "AGENT",
              subtotal: totals.subtotal,
              total: totals.total,
              userId,
              items: {
                create: lines.map((line) => ({
                  discountPercentage: line.item.product.discountPercentage,
                  lineDiscount: line.lineDiscount,
                  lineSubtotal: line.lineSubtotal,
                  lineTotal: line.lineTotal,
                  productId: line.item.product.id,
                  productTitle: line.item.product.title,
                  quantity: line.item.quantity,
                  sku: line.item.product.sku,
                  sourceProductId: line.item.product.sourceId,
                  unitPrice: line.item.product.price,
                })),
              },
            },
          });
          await transaction.idempotencyRecord.create({
            data: { key: grant.idempotencyKey, orderId: order.id, requestHash },
          });
          const confirmedAt = new Date();
          await transaction.confirmationGrant.update({
            where: { id: grant.id },
            data: { consumedAt: confirmedAt },
          });
          await transaction.draftOrder.update({
            where: { id: draft.id },
            data: { activeKey: null, status: "CONFIRMED" },
          });
          return { idempotent: false, order: orderResponse(order) };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        attempt === 0 &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new HttpError(409, "IDEMPOTENCY_CONFLICT", "Order confirmation could not be serialized.");
}

export async function getOrder(sessionId: string, userId: string, orderNumber: string) {
  const order = await prisma.order.findFirst({
    include: orderInclude,
    where: { chatSessionId: sessionId, orderNumber, userId },
  });
  if (!order) throw new HttpError(404, "ORDER_NOT_FOUND", "Order was not found.");
  return orderResponse(order);
}

function assertProductQuantity(
  product: { id: string; isOrderable: boolean; minimumOrderQuantity: number; stock: number },
  quantity: number,
) {
  const details = {
    minimumOrderQuantity: product.minimumOrderQuantity,
    productId: product.id,
    quantity,
    stock: product.stock,
  };
  if (product.stock === 0)
    throw new HttpError(409, "PRODUCT_OUT_OF_STOCK", "Product is out of stock.", details);
  if (quantity < product.minimumOrderQuantity)
    throw new HttpError(
      422,
      "MINIMUM_ORDER_NOT_MET",
      "Quantity is below the minimum order.",
      details,
    );
  if (quantity > product.stock)
    throw new HttpError(
      409,
      "INSUFFICIENT_STOCK",
      "Requested quantity exceeds current stock.",
      details,
    );
  if (!product.isOrderable)
    throw new HttpError(
      409,
      "PRODUCT_NOT_ORDERABLE",
      "Product is not currently orderable.",
      details,
    );
}

function orderResponse(order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>) {
  return {
    createdAt: order.createdAt,
    customer: {
      address: order.customerAddress,
      email: order.customerEmail,
      name: order.customerName,
      note: order.customerNote,
      whatsapp: order.customerWhatsapp,
    },
    id: order.id,
    items: order.items.map((item) => ({
      discountPercentage: Number(item.discountPercentage),
      id: item.id,
      lineDiscount: Number(item.lineDiscount),
      lineSubtotal: Number(item.lineSubtotal),
      lineTotal: Number(item.lineTotal),
      productId: item.productId,
      productTitle: item.productTitle,
      quantity: item.quantity,
      sku: item.sku,
      unitPrice: Number(item.unitPrice),
    })),
    orderNumber: order.orderNumber,
    status: order.status,
    totals: {
      currency: order.currency,
      discountTotal: Number(order.discountTotal),
      subtotal: Number(order.subtotal),
      total: Number(order.total),
    },
  };
}

function confirmationHash(
  sessionId: string,
  userId: string,
  draftId: string,
  draftVersion: number,
) {
  return createHash("sha256")
    .update(`${sessionId}:${userId}:${draftId}:${draftVersion}`)
    .digest("hex");
}

function createOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `ORD-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
}
