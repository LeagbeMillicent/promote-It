import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json() as { password?: string };
    const password = body.password?.trim() || "password123";
    const hash = await bcrypt.hash(password, 8);
    await db.user.update({ where: { id }, data: { passwordHash: hash, updatedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Password could not be reset" }, { status: 400 });
  }
}