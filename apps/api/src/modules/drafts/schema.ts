import { z } from "zod";

export const sessionParamsSchema = z.object({
  sessionId: z.string().trim().min(1),
});

export const draftItemParamsSchema = sessionParamsSchema.extend({
  itemId: z.string().trim().min(1),
});

export const addDraftItemSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.number().int().positive(),
});

export const updateDraftItemSchema = z.object({
  quantity: z.number().int().positive(),
});

export const saveCustomerDataSchema = z.object({
  address: z.string().trim().min(10).max(500),
  email: z.string().trim().email().max(254).optional(),
  name: z.string().trim().min(1).max(100),
  note: z.string().trim().max(500).optional(),
  whatsapp: z
    .string()
    .trim()
    .min(7)
    .max(30)
    .refine((value) => value.replace(/\D/g, "").length >= 7, "WhatsApp number is incomplete."),
});

export type AddDraftItemInput = z.infer<typeof addDraftItemSchema>;
export type SaveCustomerDataInput = z.infer<typeof saveCustomerDataSchema>;
