import type { UIMessage } from "@anvia/react";

export type ChatSession = {
  createdAt: string;
  id: string;
  updatedAt: string;
};

export type StoredChatSession = {
  createdAt: string;
  id: string;
  title: string;
};

export type ChatBootstrap = {
  initialMessages: UIMessage[];
  session: ChatSession;
};

export type Product = {
  brand: string | null;
  category: string;
  description: string;
  discountedPrice: number;
  discountPercentage: number;
  id: string;
  images: string[];
  isOrderable: boolean;
  minimumOrderQuantity: number;
  price: number;
  rating: number;
  sku: string;
  sourceId: number;
  stock: number;
  tags: string[];
  thumbnail: string;
  title: string;
};

export type DraftCustomer = {
  address: string | null;
  email: string | null;
  name: string | null;
  note: string | null;
  whatsapp: string | null;
};

export type DraftLine = {
  discountPercentage: number;
  id: string;
  lineDiscount: number;
  lineSubtotal: number;
  lineTotal: number;
  minimumOrderQuantity: number;
  productId: string;
  productTitle: string;
  quantity: number;
  sku: string;
  thumbnail: string | null;
  unitPrice: number;
};

export type Totals = {
  currency: string;
  discountTotal: number;
  subtotal: number;
  total: number;
};

export type Draft = {
  customer: DraftCustomer;
  id: string;
  items: DraftLine[];
  sessionId: string;
  status: "ACTIVE" | "CANCELLED" | "CONFIRMED";
  totals: Totals;
  version: number;
};

export type OrderSummary = {
  customer: RequiredCustomer;
  draftId: string;
  draftVersion: number;
  expiresAt: string;
  items: DraftLine[];
  totals: Totals;
};

export type RequiredCustomer = {
  address: string;
  email: string | null;
  name: string;
  note: string | null;
  whatsapp: string;
};

export type ConfirmedOrder = {
  createdAt: string;
  customer: RequiredCustomer;
  id: string;
  items: Array<{
    id: string;
    lineDiscount: number;
    lineSubtotal: number;
    lineTotal: number;
    productId: string | null;
    productTitle: string;
    quantity: number;
    sku: string | null;
    unitPrice: number;
  }>;
  orderNumber: string;
  status: "CONFIRMED";
  totals: Totals;
};

export type ToolErrorResult = {
  code: string;
  details?: Record<string, unknown>;
  message: string;
  retryable: boolean;
};

export type ToolEnvelope =
  | { data: unknown; ok: true }
  | { error: ToolErrorResult; ok: false };

