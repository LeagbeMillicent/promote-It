import { PaymentMethod, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { applyInventoryChange } from "@/lib/services/inventory";
import { createSaleSchema, type CreateSaleInput } from "@/lib/validation/sale";

export async function createSale(input: CreateSaleInput) {
  const validated = createSaleSchema.parse(input);

  return db.$transaction(async (transaction) => {
    const variantIds = validated.items.map((item) => item.productVariantId);
    const variants = await transaction.productVariant.findMany({
      where: { id: { in: variantIds }, locationId: validated.locationId },
      select: { id: true, stock: true, costPrice: true },
    });
    const variantById = new Map(variants.map((variant) => [variant.id, variant]));

    for (const item of validated.items) {
      const variant = variantById.get(item.productVariantId);
      if (!variant) throw new Error("One or more products are unavailable at this location");
      if (variant.stock < item.quantity) {
        throw new Error(`Insufficient stock for product variant ${item.productVariantId}`);
      }
    }

    const saleItems = validated.items.map((item) => {
      const variant = variantById.get(item.productVariantId);
      if (!variant) throw new Error("Product variant was not found");
      const unitPrice = new Prisma.Decimal(item.unitPrice);
      const discount = new Prisma.Decimal(item.discount);
      const total = unitPrice.mul(item.quantity).sub(discount);
      if (total.isNegative()) throw new Error("Sale item discount cannot exceed its value");
      return {
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        unitPrice,
        unitCost: variant.costPrice,
        discount,
        total,
      };
    });

    const subtotal = saleItems.reduce((sum, item) => sum.add(item.total), new Prisma.Decimal(0));
    const discount = new Prisma.Decimal(validated.discount);
    const total = subtotal.sub(discount);
    if (total.isNegative()) throw new Error("Sale discount cannot exceed the subtotal");
    if (new Prisma.Decimal(validated.payment.amount).lessThan(total)) {
      throw new Error("Payment amount is less than the sale total");
    }

    const sale = await transaction.sale.create({
      data: {
        saleNumber: validated.saleNumber,
        locationId: validated.locationId,
        cashierId: validated.cashierId,
        customerId: validated.customerId,
        subtotal,
        discount,
        total,
        status: validated.status ?? "COMPLETED",
        items: { create: saleItems },
        payments: {
          create: {
            method: validated.payment.method as PaymentMethod,
            amount: new Prisma.Decimal(validated.payment.amount),
            reference: validated.payment.reference,
            status: validated.status === "CANCELLED" ? "PENDING" : "PAID",
          },
        },
      },
      include: { items: true, payments: true },
    });

    for (const item of validated.items) {
      await applyInventoryChange(transaction, {
        productVariantId: item.productVariantId,
        locationId: validated.locationId,
        userId: validated.cashierId,
        quantity: item.quantity,
        type: "SALE",
        unitCost: variantById.get(item.productVariantId)?.costPrice,
        reference: sale.saleNumber,
      });
    }

    await transaction.auditLog.create({
      data: {
        userId: validated.cashierId,
        action: "SALE_CREATED",
        entityType: "Sale",
        entityId: sale.id,
        newValues: { saleNumber: sale.saleNumber, total: total.toString() },
      },
    });

    return sale;
  });
}
