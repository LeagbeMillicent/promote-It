import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let name = "";
  try {
    const body = (await request.json()) as { name?: string };
    name = body.name?.trim() || "";
    if (!name) return NextResponse.json({ error: "Brand name is required" }, { status: 400 });

    const existing = await db.brand.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json({ id: existing.id, name: existing.name }, { status: 200 });
    }

    const brand = await db.brand.create({ data: { name } });
    return NextResponse.json({ id: brand.id, name: brand.name }, { status: 201 });
  } catch (error) {
    if (
      (error as { code?: string })?.code === "P2002" ||
      (error instanceof Error && error.message.includes("Brand_name_key"))
    ) {
      if (name) {
        const existing = await db.brand.findFirst({
          where: { name: { equals: name, mode: "insensitive" } },
        });
        if (existing) {
          return NextResponse.json({ id: existing.id, name: existing.name }, { status: 200 });
        }
      }
      return NextResponse.json({ error: "A brand with this name already exists" }, { status: 409 });
    }
    return formatErrorResponse(error, "Brand could not be created");
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