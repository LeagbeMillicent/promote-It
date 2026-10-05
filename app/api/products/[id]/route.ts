import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json() as {
      name?: string;
      sku?: string;
      costPrice?: number;
      sellingPrice?: number;
      stock?: number;
      reorderLevel?: number;
      categoryId?: string;
      brandId?: string;
      active?: boolean;
    };

    const existingVariant = await db.productVariant.findFirst({
      where: {
        OR: [
          { id },
          { sku: id },
        ],
      },
    });

    if (!existingVariant) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (body.categoryId || body.brandId !== undefined || body.name !== undefined || body.active !== undefined) {
      const productUpdate: Record<string, unknown> = { updatedAt: new Date() };
      if (body.name !== undefined) productUpdate.name = body.name.trim();
      if (body.categoryId) productUpdate.categoryId = body.categoryId;
      if (body.brandId !== undefined) productUpdate.brandId = body.brandId || null;
      if (body.active !== undefined) productUpdate.active = body.active;
      await db.product.update({
        where: { id: existingVariant.productId },
        data: productUpdate,
      });
    }

    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.sku !== undefined) data.sku = body.sku.trim();
    if (body.costPrice !== undefined) data.costPrice = body.costPrice;
    if (body.sellingPrice !== undefined) data.sellingPrice = body.sellingPrice;
    if (body.stock !== undefined) data.stock = body.stock;
    if (body.reorderLevel !== undefined) data.reorderLevel = body.reorderLevel;

    const variant = await db.productVariant.update({
      where: { id: existingVariant.id },
      data,
      include: { product: { include: { category: true, brand: true } } },
    });

    const outOfStock = variant.stock === 0;
    const critical = variant.stock > 0 && variant.stock <= Math.max(1, Math.floor(variant.reorderLevel / 2));
    const lowStock = !outOfStock && variant.stock <= variant.reorderLevel;
    const status = outOfStock ? "Out of stock" : critical ? "Critical" : lowStock ? "Low stock" : "In stock";
    const tone = outOfStock || critical ? "red" : lowStock ? "orange" : "green";

    return NextResponse.json({
      variantId: variant.id,
      productId: variant.productId,
      categoryId: variant.product.categoryId,
      brandId: variant.product.brandId ?? undefined,
      costPrice: Number(variant.costPrice),
      sellingPrice: Number(variant.sellingPrice),
      stock: variant.stock,
      reorderLevel: variant.reorderLevel,
      id: `PRD-${variant.id.replaceAll("-", "").slice(-8).toUpperCase()}`,
      values: [
        variant.name,
        variant.product.category.name,
        variant.product.brand?.name ?? "Unbranded",
        variant.sku,
        `GHS ${Number(variant.sellingPrice).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`,
        `${variant.stock} units`,
        status,
      ],
      status,
      tone,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("Unique constraint") || msg.includes("P2002") || msg.includes("sku")) {
      return NextResponse.json({ error: "A product with this SKU already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Product could not be updated" }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await db.productVariant.findFirst({
      where: {
        OR: [
          { id },
          { sku: id },
        ],
      },
    });
    if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    await db.productVariant.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isConstraint = msg.includes("foreign key") || msg.includes("Foreign key") || msg.includes("violates") || msg.includes("restrict");
    return NextResponse.json(
      {
        error: isConstraint
          ? "This product is referenced by sales, purchases, or inventory movements and cannot be deleted. Deactivate it instead."
          : "Product could not be deleted.",
      },
      { status: 400 }
    );
  }
}