CREATE TYPE "DraftOrderStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'CONFIRMED');
CREATE TYPE "OrderStatus" AS ENUM ('CONFIRMED');
CREATE TYPE "OrderSource" AS ENUM ('HISTORICAL', 'AGENT');

CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Product" (
  "id" TEXT NOT NULL,
  "sourceId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "price" DECIMAL(12,2) NOT NULL,
  "discountPercentage" DECIMAL(5,2) NOT NULL,
  "rating" DECIMAL(3,2) NOT NULL,
  "stock" INTEGER NOT NULL,
  "brand" TEXT,
  "categoryId" TEXT NOT NULL,
  "thumbnail" TEXT NOT NULL,
  "images" JSONB NOT NULL,
  "tags" JSONB NOT NULL,
  "sku" TEXT NOT NULL,
  "minimumOrderQuantity" INTEGER NOT NULL DEFAULT 1,
  "isOrderable" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoreProfile" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "name" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "orderPolicy" TEXT NOT NULL,
  "shippingPolicy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL,
  "sourceId" INTEGER,
  "userId" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "image" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DraftOrder" (
  "id" TEXT NOT NULL,
  "chatSessionId" TEXT NOT NULL,
  "activeKey" TEXT,
  "status" "DraftOrderStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "currency" TEXT NOT NULL,
  "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "customerName" TEXT,
  "customerWhatsapp" TEXT,
  "customerAddress" TEXT,
  "customerEmail" TEXT,
  "customerNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DraftOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DraftOrderItem" (
  "id" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productTitle" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "discountPercentage" DECIMAL(5,2) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "minimumOrderQuantity" INTEGER NOT NULL,
  "lineSubtotal" DECIMAL(12,2) NOT NULL,
  "lineDiscount" DECIMAL(12,2) NOT NULL,
  "lineTotal" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DraftOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConfirmationGrant" (
  "id" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "draftVersion" INTEGER NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConfirmationGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "sourceId" INTEGER,
  "userId" TEXT,
  "customerId" TEXT,
  "chatSessionId" TEXT,
  "draftId" TEXT,
  "source" "OrderSource" NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'CONFIRMED',
  "currency" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerWhatsapp" TEXT NOT NULL,
  "customerAddress" TEXT NOT NULL,
  "customerEmail" TEXT,
  "customerNote" TEXT,
  "subtotal" DECIMAL(12,2) NOT NULL,
  "discountTotal" DECIMAL(12,2) NOT NULL,
  "total" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT,
  "sourceProductId" INTEGER,
  "productTitle" TEXT NOT NULL,
  "sku" TEXT,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "discountPercentage" DECIMAL(5,2) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "lineSubtotal" DECIMAL(12,2) NOT NULL,
  "lineDiscount" DECIMAL(12,2) NOT NULL,
  "lineTotal" DECIMAL(12,2) NOT NULL,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IdempotencyRecord" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentMemorySession" (
  "id" TEXT NOT NULL,
  "scopeKey" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentMemorySession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentMemoryMessage" (
  "id" TEXT NOT NULL,
  "memorySessionId" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "turn" INTEGER NOT NULL,
  "position" INTEGER NOT NULL,
  "role" TEXT NOT NULL,
  "message" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentMemoryMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentMemoryError" (
  "id" TEXT NOT NULL,
  "memorySessionId" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "error" JSONB NOT NULL,
  "messages" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentMemoryError_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE UNIQUE INDEX "Product_sourceId_key" ON "Product"("sourceId");
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_title_idx" ON "Product"("title");
CREATE INDEX "Product_price_idx" ON "Product"("price");
CREATE UNIQUE INDEX "Customer_sourceId_key" ON "Customer"("sourceId");
CREATE UNIQUE INDEX "Customer_userId_key" ON "Customer"("userId");
CREATE INDEX "ChatSession_userId_updatedAt_idx" ON "ChatSession"("userId", "updatedAt");
CREATE UNIQUE INDEX "DraftOrder_activeKey_key" ON "DraftOrder"("activeKey");
CREATE INDEX "DraftOrder_status_idx" ON "DraftOrder"("status");
CREATE INDEX "DraftOrder_chatSessionId_status_idx" ON "DraftOrder"("chatSessionId", "status");
CREATE UNIQUE INDEX "DraftOrderItem_draftId_productId_key" ON "DraftOrderItem"("draftId", "productId");
CREATE INDEX "DraftOrderItem_productId_idx" ON "DraftOrderItem"("productId");
CREATE UNIQUE INDEX "ConfirmationGrant_idempotencyKey_key" ON "ConfirmationGrant"("idempotencyKey");
CREATE UNIQUE INDEX "ConfirmationGrant_draftId_draftVersion_key" ON "ConfirmationGrant"("draftId", "draftVersion");
CREATE INDEX "ConfirmationGrant_expiresAt_idx" ON "ConfirmationGrant"("expiresAt");
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE UNIQUE INDEX "Order_sourceId_key" ON "Order"("sourceId");
CREATE UNIQUE INDEX "Order_draftId_key" ON "Order"("draftId");
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
CREATE INDEX "Order_chatSessionId_createdAt_idx" ON "Order"("chatSessionId", "createdAt");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");
CREATE UNIQUE INDEX "IdempotencyRecord_key_key" ON "IdempotencyRecord"("key");
CREATE UNIQUE INDEX "IdempotencyRecord_orderId_key" ON "IdempotencyRecord"("orderId");
CREATE UNIQUE INDEX "AgentMemorySession_scopeKey_key" ON "AgentMemorySession"("scopeKey");
CREATE INDEX "AgentMemorySession_sessionId_userId_idx" ON "AgentMemorySession"("sessionId", "userId");
CREATE UNIQUE INDEX "AgentMemoryMessage_memorySessionId_position_key" ON "AgentMemoryMessage"("memorySessionId", "position");
CREATE INDEX "AgentMemoryMessage_runId_idx" ON "AgentMemoryMessage"("runId");
CREATE INDEX "AgentMemoryError_runId_idx" ON "AgentMemoryError"("runId");

ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DraftOrder" ADD CONSTRAINT "DraftOrder_chatSessionId_fkey" FOREIGN KEY ("chatSessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DraftOrderItem" ADD CONSTRAINT "DraftOrderItem_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "DraftOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DraftOrderItem" ADD CONSTRAINT "DraftOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConfirmationGrant" ADD CONSTRAINT "ConfirmationGrant_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "DraftOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_chatSessionId_fkey" FOREIGN KEY ("chatSessionId") REFERENCES "ChatSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "DraftOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentMemoryMessage" ADD CONSTRAINT "AgentMemoryMessage_memorySessionId_fkey" FOREIGN KEY ("memorySessionId") REFERENCES "AgentMemorySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentMemoryError" ADD CONSTRAINT "AgentMemoryError_memorySessionId_fkey" FOREIGN KEY ("memorySessionId") REFERENCES "AgentMemorySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
