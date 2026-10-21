import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const category = await db.category.findUnique({
      where: { id },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            active: true,
          },
          take: 10,
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    return formatErrorResponse(error, "Failed to retrieve category");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { name?: string };

    const existing = await db.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const trimmed = body.name?.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Category name cannot be empty" }, { status: 400 });
    }

    // Check name uniqueness among other categories
    const duplicate = await db.category.findFirst({
      where: {
        id: { not: id },
        name: { equals: trimmed, mode: "insensitive" },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: `Another category named "${duplicate.name}" already exists.` },
        { status: 409 }
      );
    }

    const updated = await db.category.update({
      where: { id },
      data: {
        name: trimmed,
        updatedAt: new Date(),
      },
      include: {
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return formatErrorResponse(error, "Category could not be updated");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const category = await db.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    if (category._count.products > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category "${category.name}" because ${category._count.products} product(s) are assigned to it. Please reassign those products first.`,
          productsCount: category._count.products,
        },
        { status: 400 }
      );
    }

    await db.category.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true, id, name: category.name });
  } catch (error) {
    return formatErrorResponse(
      error,
      "This category is referenced by existing catalog items and cannot be deleted."
    );
  }
}
