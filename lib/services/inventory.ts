import { InventoryMovementType, Prisma } from "@prisma/client";

export type InventoryChange = {
  productVariantId: string;
  locationId: string;
  userId: string;
  quantity: number;
  type: InventoryMovementType;
  unitCost?: Prisma.Decimal | number;
  reference?: string;
  reason?: string;
};

export async function applyInventoryChange(
  transaction: Prisma.TransactionClient,
  change: InventoryChange,
) {
  if (!Number.isInteger(change.quantity) || change.quantity <= 0) {
    throw new Error("Inventory quantity must be a positive whole number");
  }

  const inboundTypes = new Set<InventoryMovementType>([
    InventoryMovementType.PURCHASE,
    InventoryMovementType.RETURN_IN,
    InventoryMovementType.ADJUSTMENT_IN,
    InventoryMovementType.OPENING_BALANCE,
  ]);
  const direction = inboundTypes.has(change.type) ? 1 : -1;
  const signedQuantity = direction * change.quantity;

  const variant = await transaction.productVariant.findUnique({
    where: { id: change.productVariantId },
    select: { id: true, stock: true, locationId: true },
  });

  if (!variant || variant.locationId !== change.locationId) {
    throw new Error("Product variant was not found at this location");
  }
  if (variant.stock + signedQuantity < 0) {
    throw new Error("Inventory change would result in negative stock");
  }

  const [updatedVariant, movement] = await transaction.$transaction([
    transaction.productVariant.update({
      where: { id: change.productVariantId },
      data: { stock: { increment: signedQuantity } },
    }),
    transaction.inventoryMovement.create({
      data: {
        productVariantId: change.productVariantId,
        locationId: change.locationId,
        userId: change.userId,
        type: change.type,
        quantity: signedQuantity,
        unitCost: change.unitCost,
        reference: change.reference,
        reason: change.reason,
      },
    }),
  ]);

  return { updatedVariant, movement };
}
