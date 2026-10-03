import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { applyInventoryChange } from "@/lib/services/inventory";

export async function receivePurchase(purchaseId: string, userId: string) {
  return db.$transaction(async (transaction) => {
    const purchase = await transaction.purchase.findUnique({
      where: { id: purchaseId },
      include: { items: true },
    });

    if (!purchase) throw new Error("Purchase was not found");
    if (purchase.status !== "DRAFT") throw new Error("Only draft purchases can be received");

    for (const item of purchase.items) {
      await applyInventoryChange(transaction, {
        productVariantId: item.productVariantId,
        locationId: purchase.locationId,
        userId,
        quantity: item.quantity,
        type: "PURCHASE",
        unitCost: item.unitCost,
        reference: purchase.purchaseNumber,
      });
    }

    const receivedPurchase = await transaction.purchase.update({
      where: { id: purchaseId },
      data: { status: "RECEIVED", receivedAt: new Date() },
    });

    await transaction.auditLog.create({
      data: {
        userId,
        action: "PURCHASE_RECEIVED",
        entityType: "Purchase",
        entityId: purchase.id,
        newValues: {
          purchaseNumber: purchase.purchaseNumber,
          total: new Prisma.Decimal(purchase.total).toString(),
        },
      },
    });

    return receivedPurchase;
  });
}
