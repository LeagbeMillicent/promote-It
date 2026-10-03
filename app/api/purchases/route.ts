import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const purchases = await db.purchase.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        supplier: true,
        items: {
          include: {
            productVariant: {
              include: { product: true },
            },
          },
        },
      },
    });

    return NextResponse.json(
      purchases.map((purchase) => {
        const totalUnits = purchase.items.reduce((sum, item) => sum + item.quantity, 0);
        return {
          id: purchase.purchaseNumber,
          purchaseId: purchase.id,
          supplierId: purchase.supplierId,
          supplierName: purchase.supplier.name,
          supplierPhone: purchase.supplier.phone,
          supplierEmail: purchase.supplier.email,
          totalAmount: Number(purchase.total),
          createdAt: purchase.createdAt.toISOString(),
          items: purchase.items.map((item) => ({
            id: item.id,
            productVariantId: item.productVariantId,
            name: item.productVariant?.product?.name || item.productVariant?.name || "Product",
            sku: item.productVariant?.sku || "",
            quantity: item.quantity,
            unitCost: Number(item.unitCost),
            total: Number(item.total),
          })),
          values: [
            purchase.supplier.name,
            `${purchase.items.length} ${purchase.items.length === 1 ? "item" : "items"} (${totalUnits} units)`,
            `GHS ${Number(purchase.total).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`,
            purchase.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            purchase.status.charAt(0) + purchase.status.slice(1).toLowerCase(),
          ],
          status: purchase.status.charAt(0) + purchase.status.slice(1).toLowerCase(),
          tone: purchase.status === "RECEIVED" ? "green" : purchase.status === "CANCELLED" ? "red" : "orange",
        };
      })
    );
  } catch {
    return NextResponse.json({ error: "Purchase data is unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      supplierId?: string;
      locationId?: string;
      status?: "DRAFT" | "RECEIVED" | "CANCELLED";
      items?: { productVariantId: string; quantity: number; unitCost: number }[];
    };
    if (
      !body.supplierId ||
      !body.items?.length ||
      body.items.some((item) => item.quantity < 1 || item.unitCost < 0)
    )
      return NextResponse.json(
        { error: "Supplier and valid purchase items are required" },
        { status: 400 }
      );
    const [supplier, location, user] = await Promise.all([
      db.supplier.findUnique({ where: { id: body.supplierId } }),
      body.locationId
        ? db.location.findUnique({ where: { id: body.locationId } })
        : db.location.findFirst({ orderBy: { createdAt: "asc" } }),
      db.user.findFirst({ orderBy: { createdAt: "asc" } }),
    ]);
    if (!supplier || !location || !user)
      return NextResponse.json(
        { error: "Supplier, location, or user was not found" },
        { status: 404 }
      );
    const total = body.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
    const purchaseStatus = body.status === "RECEIVED" ? "RECEIVED" : "DRAFT";
    const purchase = await db.purchase.create({
      data: {
        purchaseNumber: `PUR-${Date.now().toString().slice(-8)}`,
        supplierId: supplier.id,
        locationId: location.id,
        createdById: user.id,
        status: purchaseStatus,
        total,
        items: {
          create: body.items.map((item) => ({
            productVariantId: item.productVariantId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            total: item.quantity * item.unitCost,
          })),
        },
      },
      include: {
        supplier: true,
        items: {
          include: {
            productVariant: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (purchaseStatus === "RECEIVED") {
      const { receivePurchase } = await import("@/lib/services/purchases");
      await receivePurchase(purchase.id, user.id);
    }

    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Purchase could not be created" },
      { status: 400 }
    );
  }
}