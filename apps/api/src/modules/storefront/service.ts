import { HttpError } from "../../http-error";
import { prisma } from "../../prisma";
import type { StorefrontResponse } from "./types";

export async function getStorefront(): Promise<StorefrontResponse> {
  const storefront = await prisma.storeProfile.findUnique({
    where: { id: "default" },
    select: {
      currency: true,
      id: true,
      locale: true,
      name: true,
      orderPolicy: true,
      shippingPolicy: true,
    },
  });

  if (!storefront) {
    throw new HttpError(500, "INTERNAL_ERROR", "Store profile is not configured.");
  }

  return storefront;
}
