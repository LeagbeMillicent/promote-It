import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    const categories = await db.category.findMany({
      where: query
        ? {
            name: { contains: query, mode: "insensitive" },
          }
        : undefined,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json({ error: "Category data is unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let name = "";
  try {
    const body = (await request.json()) as {
      name?: string;
      allowExisting?: boolean;
    };
    name = body.name?.trim() || "";
    if (!name) return NextResponse.json({ error: "Category name is required" }, { status: 400 });

    const existing = await db.category.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { products: true } },
      },
    });

    if (existing) {
      if (body.allowExisting) {
        return NextResponse.json(existing, { status: 200 });
      }
      return NextResponse.json(
        { error: `A category named "${existing.name}" already exists.` },
        { status: 409 }
      );
    }

    const category = await db.category.create({
      data: { name },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (
      (error as { code?: string })?.code === "P2002" ||
      (error instanceof Error && error.message.includes("Category_name_key"))
    ) {
      return NextResponse.json({ error: "A category with this name already exists" }, { status: 409 });
    }
    return formatErrorResponse(error, "Category could not be created");
  }
}