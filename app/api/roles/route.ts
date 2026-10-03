import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const roles = await db.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
    return NextResponse.json(roles);
  } catch {
    return NextResponse.json({ error: "Role data is unavailable" }, { status: 503 });
  }
}