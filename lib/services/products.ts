import { db } from "@/lib/db";
import { createProductSchema, type CreateProductInput } from "@/lib/validation/product";

export async function createProduct(input: CreateProductInput, createdById: string) {
  const validated = createProductSchema.parse(input);

  return db.$transaction(async (transaction) => {
    const product = await transaction.product.create({
      data: {
        name: validated.name,
        description: validated.description,
        categoryId: validated.categoryId,
        brandId: validated.brandId || null,
        variants: {
          create: validated.variants.map((variant) => ({
            name: variant.name,
            sku: variant.sku,
            barcode: variant.barcode || null,
            unit: variant.unit,
            costPrice: variant.costPrice,
            sellingPrice: variant.sellingPrice,
            stock: variant.stock,
            reorderLevel: variant.reorderLevel,
            locationId: validated.locationId,
          })),
        },
      },
      include: { variants: true },
    });

    await transaction.auditLog.create({
      data: {
        userId: createdById,
        action: "PRODUCT_CREATED",
        entityType: "Product",
        entityId: product.id,
        newValues: {
          name: product.name,
          variantCount: product.variants.length,
        },
      },
    });

    return product;
  });
}
