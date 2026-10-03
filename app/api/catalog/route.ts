import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [categories, brands, locations, users, products] = await Promise.all([
      db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      db.location.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      db.productVariant.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, sku: true, costPrice: true, sellingPrice: true, stock: true } }),
    ]);
    return NextResponse.json({ categories, brands, locations, users, products: products.map((product) => ({ ...product, costPrice: Number(product.costPrice), sellingPrice: Number(product.sellingPrice) })) });
  } catch {
    return NextResponse.json({ error: "Catalog metadata is unavailable" }, { status: 503 });
  }
}
