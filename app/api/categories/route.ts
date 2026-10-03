import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string; parentId?: string };
    if (!body.name?.trim()) return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    const category = await db.category.create({ data: { name: body.name.trim(), parentId: body.parentId || null } });
    return NextResponse.json({ id: category.id, name: category.name }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Category could not be created" }, { status: 400 });
  }
}