import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    const brands = await db.brand.findMany({
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

    return NextResponse.json(brands);
  } catch (error) {
    console.error("GET /api/brands error:", error);
    return NextResponse.json({ error: "Brand data is unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let name = "";
  try {
    const body = (await request.json()) as { name?: string; allowExisting?: boolean };
    name = body.name?.trim() || "";
    if (!name) return NextResponse.json({ error: "Brand name is required" }, { status: 400 });

    const existing = await db.brand.findFirst({
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
        { error: `A brand named "${existing.name}" already exists.` },
        { status: 409 }
      );
    }

    const brand = await db.brand.create({
      data: { name },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    if (
      (error as { code?: string })?.code === "P2002" ||
      (error instanceof Error && error.message.includes("Brand_name_key"))
    ) {
      return NextResponse.json({ error: "A brand with this name already exists" }, { status: 409 });
    }
    return formatErrorResponse(error, "Brand could not be created");
  }
}