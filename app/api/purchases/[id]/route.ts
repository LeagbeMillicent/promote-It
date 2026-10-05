import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const purchase = await db.purchase.findFirst({
      where: { OR: [{ id }, { purchaseNumber: id }] },
      include: {
        supplier: true,
        location: true,
        createdBy: true,
        items: {
          include: {
            productVariant: {
              include: { product: true },
            },
          },
        },
      },
    });
    if (!purchase) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    return NextResponse.json(purchase);
  } catch {
    return NextResponse.json({ error: "Could not retrieve purchase" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      status?: "DRAFT" | "RECEIVED" | "CANCELLED";
      supplierId?: string;
      items?: { productVariantId: string; quantity: number; unitCost: number }[];
    };

    const existing = await db.purchase.findFirst({
      where: { OR: [{ id }, { purchaseNumber: id }] },
    });
    if (!existing) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });

    const updateData: {
      status?: "DRAFT" | "RECEIVED" | "CANCELLED";
      supplierId?: string;
      total?: number;
      items?: {
        create: {
          productVariantId: string;
          quantity: number;
          unitCost: number;
          total: number;
        }[];
      };
    } = {};

    if (body.status) updateData.status = body.status;
    if (body.supplierId) updateData.supplierId = body.supplierId;

    if (body.items && body.items.length > 0) {
      const total = body.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
      updateData.total = total;
      await db.purchaseItem.deleteMany({ where: { purchaseId: existing.id } });
      updateData.items = {
        create: body.items.map((item) => ({
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          total: item.quantity * item.unitCost,
        })),
      };
    }

    const purchase = await db.purchase.update({
      where: { id: existing.id },
      data: updateData,
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

    if (body.status === "RECEIVED" && existing.status !== "RECEIVED") {
      const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
      if (user) {
        const { receivePurchase } = await import("@/lib/services/purchases");
        await receivePurchase(purchase.id, user.id);
      }
    }

    return NextResponse.json(purchase);
  } catch (error) {
    return formatErrorResponse(error, "Purchase could not be updated");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await db.purchase.findFirst({
      where: { OR: [{ id }, { purchaseNumber: id }] },
    });
    if (!existing) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    await db.purchase.update({ where: { id: existing.id }, data: { status: "CANCELLED" } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return formatErrorResponse(error, "Purchase could not be cancelled");
  }
}