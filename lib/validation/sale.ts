import { z } from "zod";

export const paymentInputSchema = z.object({
  method: z.enum(["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "OTHER"]),
  amount: z.coerce.number().finite().positive("Payment must be greater than zero"),
  reference: z.string().trim().max(120).optional(),
});

export const createSaleSchema = z.object({
  saleNumber: z.string().trim().min(1).max(30),
  locationId: z.string().trim().min(1),
  cashierId: z.string().trim().min(1),
  customerId: z.string().trim().min(1).optional(),
  discount: z.coerce.number().finite().nonnegative().default(0),
  status: z.enum(["COMPLETED", "CANCELLED"]).default("COMPLETED").optional(),
  items: z.array(z.object({
    productVariantId: z.string().trim().min(1),
    quantity: z.coerce.number().int().positive(),
    unitPrice: z.coerce.number().finite().nonnegative(),
    discount: z.coerce.number().finite().nonnegative().default(0),
  })).min(1, "A sale needs at least one item"),
  payment: paymentInputSchema,
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
