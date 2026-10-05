import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createProduct } from "@/lib/services/products";
import { formatErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const variants = await db.productVariant.findMany({
      orderBy: { createdAt: "desc" },
      include: { product: { include: { category: true, brand: true } } },
    });

    return NextResponse.json(variants.map((variant) => {
      const outOfStock = variant.stock === 0;
      const critical = variant.stock > 0 && variant.stock <= Math.max(1, Math.floor(variant.reorderLevel / 2));
      const lowStock = !outOfStock && variant.stock <= variant.reorderLevel;
      const status = outOfStock ? "Out of stock" : critical ? "Critical" : lowStock ? "Low stock" : "In stock";
      const tone = outOfStock || critical ? "red" : lowStock ? "orange" : "green";

      return {
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
      };
    }));
  } catch (error) {
    console.error("GET /api/products failed", error);
    return NextResponse.json({ error: "Product data is unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string; categoryId?: string; brandId?: string; locationId?: string; costPrice?: number; sellingPrice?: number; stock?: number; reorderLevel?: number; sku?: string };
    const [category, location, user] = await Promise.all([
      body.categoryId ? db.category.findUnique({ where: { id: body.categoryId } }) : db.category.findFirst({ orderBy: { name: "asc" } }),
      body.locationId ? db.location.findUnique({ where: { id: body.locationId } }) : db.location.findFirst({ orderBy: { name: "asc" } }),
      db.user.findFirst({ orderBy: { createdAt: "asc" } }),
    ]);
    if (!category || !location || !user) return NextResponse.json({ error: "Create a category, location, and user before adding products" }, { status: 409 });
    if (!body.name?.trim() || body.costPrice === undefined || body.sellingPrice === undefined) return NextResponse.json({ error: "Product name and prices are required" }, { status: 400 });
    const product = await createProduct({ name: body.name.trim(), categoryId: category.id, brandId: body.brandId || undefined, locationId: location.id, variants: [{ name: body.name.trim(), sku: body.sku?.trim() || `SKU-${Date.now()}`, costPrice: body.costPrice, sellingPrice: body.sellingPrice, stock: body.stock ?? 0, reorderLevel: body.reorderLevel ?? 5, unit: "piece" }] }, user.id);
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error, "Product could not be created");
  }
}
