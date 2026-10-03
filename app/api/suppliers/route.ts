import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type SupplierWithPurchases = { id: string; name: string; contactPerson: string | null; phone: string | null; email: string | null; address: string | null; active: boolean; purchases: { total: unknown }[] };
function formatSupplier(supplier: SupplierWithPurchases) {
  const purchaseSum = supplier.purchases.reduce((sum, purchase) => sum + Number(purchase.total), 0);
  return {
    id: supplier.id,
    name: supplier.name,
    initials: supplier.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    category: "Retail supplier",
    contact: supplier.contactPerson ?? "Primary contact not set",
    phone: supplier.phone ?? "No phone number",
    email: supplier.email ?? "No email address",
    location: supplier.address ?? "Address not set",
    purchases: `GHS ${purchaseSum.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`,
    purchaseAmount: purchaseSum,
    orders: `${supplier.purchases.length} orders`,
    orderCount: supplier.purchases.length,
    status: supplier.active ? "Active" : "Inactive",
    tone: supplier.active ? "green" : "neutral",
  };
}

export async function GET() { try { const suppliers = await db.supplier.findMany({ orderBy: { name: "asc" }, include: { purchases: { select: { total: true } } } }); return NextResponse.json(suppliers.map(formatSupplier)); } catch { return NextResponse.json({ error: "Supplier data is unavailable" }, { status: 503 }); } }

export async function POST(request: Request) { try { const body = await request.json() as { name?: string; contactPerson?: string; phone?: string; email?: string; address?: string; notes?: string }; if (!body.name?.trim()) return NextResponse.json({ error: "Supplier name is required" }, { status: 400 }); const supplier = await db.supplier.create({ data: { name: body.name.trim(), contactPerson: body.contactPerson?.trim(), phone: body.phone?.trim(), email: body.email?.trim(), address: body.address?.trim(), notes: body.notes?.trim() }, include: { purchases: { select: { total: true } } } }); return NextResponse.json(formatSupplier(supplier), { status: 201 }); } catch { return NextResponse.json({ error: "Supplier could not be created" }, { status: 400 }); } }

export async function PATCH(request: Request) { try { const body = await request.json() as { id?: string; name?: string; contactPerson?: string; phone?: string; email?: string; address?: string; notes?: string; active?: boolean }; if (!body.id || !body.name?.trim()) return NextResponse.json({ error: "Supplier ID and name are required" }, { status: 400 }); const supplier = await db.supplier.update({ where: { id: body.id }, data: { name: body.name.trim(), contactPerson: body.contactPerson?.trim(), phone: body.phone?.trim(), email: body.email?.trim(), address: body.address?.trim(), notes: body.notes?.trim(), ...(body.active === undefined ? {} : { active: body.active }) }, include: { purchases: { select: { total: true } } } }); return NextResponse.json(formatSupplier(supplier)); } catch { return NextResponse.json({ error: "Supplier could not be updated" }, { status: 400 }); } }

export async function DELETE(request: Request) { try { const id = new URL(request.url).searchParams.get("id"); if (!id) return NextResponse.json({ error: "Supplier ID is required" }, { status: 400 }); await db.supplier.update({ where: { id }, data: { active: false } }); return NextResponse.json({ ok: true }); } catch { return NextResponse.json({ error: "Supplier could not be deactivated" }, { status: 400 }); } }
