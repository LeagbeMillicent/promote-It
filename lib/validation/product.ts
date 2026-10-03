import { z } from "zod";

export const productVariantSchema = z.object({
  name: z.string().trim().min(1, "Variant name is required").max(120),
  sku: z.string().trim().min(1, "SKU is required").max(40),
  barcode: z.string().trim().max(60).optional().or(z.literal("")),
  unit: z.string().trim().min(1).max(30).default("piece"),
  costPrice: z.coerce.number().finite().nonnegative("Cost price cannot be negative"),
  sellingPrice: z.coerce.number().finite().nonnegative("Selling price cannot be negative"),
  stock: z.coerce.number().int().nonnegative("Stock cannot be negative").default(0),
  reorderLevel: z.coerce.number().int().nonnegative("Reorder level cannot be negative").default(5),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(2, "Product name is required").max(160),
  description: z.string().trim().max(2000).optional(),
  categoryId: z.string().trim().min(1, "Choose a valid category"),
  brandId: z.string().trim().min(1).optional().or(z.literal("")),
  locationId: z.string().trim().min(1, "Choose a valid location"),
  variants: z.array(productVariantSchema).min(1, "Add at least one product variant"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
