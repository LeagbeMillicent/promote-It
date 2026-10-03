import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string };
    if (!body.name?.trim()) return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
    const brand = await db.brand.create({ data: { name: body.name.trim() } });
    return NextResponse.json({ id: brand.id, name: brand.name }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Brand could not be created" }, { status: 400 });
  }
}

export async function GET() {
  try {
    const brands = await db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
    return NextResponse.json(brands);
  } catch {
    return NextResponse.json({ error: "Brand data is unavailable" }, { status: 503 });
  }
}