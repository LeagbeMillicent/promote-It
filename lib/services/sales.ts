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

export type GetSalesOptions = {
  searchTerm?: string;
  status?: string;
  take?: number;
};

export async function getSales(options: GetSalesOptions = {}) {
  const { searchTerm, status, take = 200 } = options;

  const where: Prisma.SaleWhereInput = {};

  if (searchTerm && searchTerm.trim()) {
    const trimmed = searchTerm.trim();
    const orConditions: Prisma.SaleWhereInput[] = [
      { saleNumber: { contains: trimmed, mode: "insensitive" } },
      { customer: { name: { contains: trimmed, mode: "insensitive" } } },
      { customer: { phone: { contains: trimmed, mode: "insensitive" } } },
      { customer: { email: { contains: trimmed, mode: "insensitive" } } },
      { cashier: { name: { contains: trimmed, mode: "insensitive" } } },
      { cashier: { email: { contains: trimmed, mode: "insensitive" } } },
      { location: { name: { contains: trimmed, mode: "insensitive" } } },
      {
        items: {
          some: {
            OR: [
              { productVariant: { name: { contains: trimmed, mode: "insensitive" } } },
              { productVariant: { sku: { contains: trimmed, mode: "insensitive" } } },
              { productVariant: { barcode: { contains: trimmed, mode: "insensitive" } } },
              { productVariant: { product: { name: { contains: trimmed, mode: "insensitive" } } } },
            ],
          },
        },
      },
      {
        payments: {
          some: {
            reference: { contains: trimmed, mode: "insensitive" },
          },
        },
      },
    ];

    const upper = trimmed.toUpperCase().replace(/\s+/g, "_");
    const matchedMethods: PaymentMethod[] = [];
    if (upper === "CASH" || upper.includes("CASH")) matchedMethods.push(PaymentMethod.CASH);
    if (upper === "MOMO" || upper === "MOBILE_MONEY" || upper.includes("MOMO") || upper.includes("MOBILE")) {
      matchedMethods.push(PaymentMethod.MOBILE_MONEY);
    }
    if (upper === "CARD" || upper.includes("CARD")) matchedMethods.push(PaymentMethod.CARD);
    if (upper === "BANK" || upper.includes("TRANSFER") || upper.includes("BANK")) {
      matchedMethods.push(PaymentMethod.BANK_TRANSFER);
    }
    if (upper === "OTHER") matchedMethods.push(PaymentMethod.OTHER);

    if (matchedMethods.length > 0) {
      orConditions.push({
        payments: {
          some: {
            method: { in: matchedMethods },
          },
        },
      });
    }

    const lower = trimmed.toLowerCase();
    if (lower === "paid" || lower === "completed") {
      orConditions.push({ status: "COMPLETED" });
    } else if (lower === "not paid" || lower === "unpaid" || lower === "cancelled") {
      orConditions.push({ status: "CANCELLED" });
    }

    const num = Number(trimmed);
    if (!isNaN(num) && num > 0) {
      orConditions.push({ total: { equals: new Prisma.Decimal(num) } });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
    if (isUuid) {
      orConditions.push({ id: trimmed });
    }

    where.OR = orConditions;
  }

  if (status) {
    const upperStatus = status.toUpperCase();
    if (upperStatus === "PAID" || upperStatus === "COMPLETED") {
      where.status = "COMPLETED";
    } else if (upperStatus === "NOT PAID" || upperStatus === "CANCELLED" || upperStatus === "UNPAID") {
      where.status = "CANCELLED";
    }
  }

  return db.sale.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    include: {
      payments: true,
      items: {
        include: {
          productVariant: {
            include: { product: true },
          },
        },
      },
      customer: true,
      cashier: true,
      location: true,
    },
  });
}
