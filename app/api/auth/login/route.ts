import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes } from "node:crypto";
import { formatErrorResponse } from "@/lib/errors";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string };
    if (!body.email?.trim() || !body.password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    const user = await db.user.findUnique({ where: { email: body.email.trim().toLowerCase() }, include: { role: true } });
    if (!user || !user.passwordHash) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    const token = randomBytes(32).toString("hex");
    const response = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role.name } });
    response.cookies.set("auth-token", token, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 8, path: "/" });
    return response;
  } catch (error) {
    return formatErrorResponse(error, "Sign-in failed. Please try again.", 500);
  }
}