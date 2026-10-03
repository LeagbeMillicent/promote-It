import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { applyInventoryChange } from "@/lib/services/inventory";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { productVariantId?: string; quantity?: number; direction?: "IN" | "OUT"; reason?: string };
    if (!body.productVariantId || !body.quantity || body.quantity < 1 || !body.reason?.trim()) return NextResponse.json({ error: "Product, positive quantity, and reason are required" }, { status: 400 });
    const [variant, location, user] = await Promise.all([db.productVariant.findUnique({ where: { id: body.productVariantId }, select: { id: true, locationId: true } }), db.location.findFirst({ orderBy: { createdAt: "asc" } }), db.user.findFirst({ orderBy: { createdAt: "asc" } })]);
    if (!variant || !location || !user) return NextResponse.json({ error: "Product, location, or user was not found" }, { status: 404 });
    const result = await db.$transaction((transaction) => applyInventoryChange(transaction, { productVariantId: variant.id, locationId: location.id, userId: user.id, quantity: body.quantity as number, type: body.direction === "OUT" ? "ADJUSTMENT_OUT" : "ADJUSTMENT_IN", reason: body.reason?.trim() }));
    return NextResponse.json(result, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Inventory adjustment failed" }, { status: 400 }); }
}