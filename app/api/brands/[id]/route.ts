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
    const brand = await db.brand.findUnique({
      where: { id },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            active: true,
            category: { select: { id: true, name: true } },
          },
          take: 10,
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    return NextResponse.json(brand);
  } catch (error) {
    return formatErrorResponse(error, "Failed to retrieve brand");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { name?: string };

    const existing = await db.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const trimmed = body.name?.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Brand name cannot be empty" }, { status: 400 });
    }

    // Check name uniqueness among other brands
    const duplicate = await db.brand.findFirst({
      where: {
        id: { not: id },
        name: { equals: trimmed, mode: "insensitive" },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: `Another brand named "${duplicate.name}" already exists.` },
        { status: 409 }
      );
    }

    const updated = await db.brand.update({
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
    return formatErrorResponse(error, "Brand could not be updated");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const brand = await db.brand.findUnique({
      where: { id },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      // Detach any products assigned to this brand
      await tx.product.updateMany({
        where: { brandId: id },
        data: { brandId: null as any },
      });

      // Hard delete the brand
      await tx.brand.delete({
        where: { id },
      });
    });

    return NextResponse.json({ ok: true, id, name: brand.name });
  } catch (error) {
    return formatErrorResponse(
      error,
      "Brand could not be deleted"
    );
  }
}
