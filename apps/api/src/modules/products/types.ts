export type ProductResponse = {
  id: string;
  sourceId: number;
  title: string;
  description: string;
  price: number;
  discountPercentage: number;
  discountedPrice: number;
  rating: number;
  stock: number;
  brand: string | null;
  category: string;
  thumbnail: string;
  images: string[];
  tags: string[];
  sku: string;
  minimumOrderQuantity: number;
  isOrderable: boolean;
};

export type AvailabilityStatus =
  | "AVAILABLE"
  | "OUT_OF_STOCK"
  | "PRODUCT_NOT_ORDERABLE"
  | "BELOW_MINIMUM_ORDER"
  | "INSUFFICIENT_STOCK";
