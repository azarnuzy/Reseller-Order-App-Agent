export type ConfirmOrderResult = {
  idempotent: boolean;
  order: {
    id: string;
    orderNumber: string;
    status: "CONFIRMED";
    createdAt: Date;
    customer: {
      name: string;
      whatsapp: string;
      address: string;
      email: string | null;
      note: string | null;
    };
    items: Array<{
      id: string;
      productId: string | null;
      productTitle: string;
      sku: string | null;
      unitPrice: number;
      discountPercentage: number;
      quantity: number;
      lineSubtotal: number;
      lineDiscount: number;
      lineTotal: number;
    }>;
    totals: {
      currency: string;
      subtotal: number;
      discountTotal: number;
      total: number;
    };
  };
};
