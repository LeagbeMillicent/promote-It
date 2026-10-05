import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let name = "";
  try {
    const body = (await request.json()) as { name?: string; parentId?: string };
    name = body.name?.trim() || "";
    if (!name) return NextResponse.json({ error: "Category name is required" }, { status: 400 });

    const existing = await db.category.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json({ id: existing.id, name: existing.name }, { status: 200 });
    }

    const category = await db.category.create({ data: { name, parentId: body.parentId || null } });
    return NextResponse.json({ id: category.id, name: category.name }, { status: 201 });
  } catch (error) {
    if (
      (error as { code?: string })?.code === "P2002" ||
      (error instanceof Error && error.message.includes("Category_name_key"))
    ) {
      if (name) {
        const existing = await db.category.findFirst({
          where: { name: { equals: name, mode: "insensitive" } },
        });
        if (existing) {
          return NextResponse.json({ id: existing.id, name: existing.name }, { status: 200 });
        }
      }
      return NextResponse.json({ error: "A category with this name already exists" }, { status: 409 });
    }
    return formatErrorResponse(error, "Category could not be created");
  }
}