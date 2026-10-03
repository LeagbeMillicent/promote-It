import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const movements = await db.inventoryMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { productVariant: true, user: true },
    });

    return NextResponse.json(movements.map((movement) => {
      const movementName = movement.type.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
      const signedQuantity = movement.quantity > 0 ? `+${movement.quantity}` : `${movement.quantity}`;
      const needsReview = movement.type === "ADJUSTMENT_IN" || movement.type === "ADJUSTMENT_OUT";
      return {
        id: `MOV-${movement.id.replaceAll("-", "").slice(-8).toUpperCase()}`,
        values: [movement.productVariant.name, `${movementName}${movement.reference ? ` · ${movement.reference}` : ""} · ${signedQuantity} units`, movement.user.name, needsReview ? "Needs review" : "Completed"],
        status: needsReview ? "Needs review" : "Completed",
        tone: needsReview ? "orange" : "green",
      };
    }));
  } catch {
    return NextResponse.json({ error: "Inventory data is unavailable" }, { status: 503 });
  }
}
