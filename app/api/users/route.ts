import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await db.user.findMany({ orderBy: { createdAt: "asc" }, include: { role: true } });
    return NextResponse.json(users.map((user) => ({
      id: `USR-${user.id.replaceAll("-", "").slice(-8).toUpperCase()}`,
      userId: user.id,
      values: [user.name, user.email, user.role.name, user.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), user.status === "ACTIVE" ? "Active" : "Inactive"],
      status: user.status === "ACTIVE" ? "Active" : "Inactive",
      tone: user.status === "ACTIVE" ? "green" : "red",
    })));
  } catch {
    return NextResponse.json({ error: "User data is unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string; email?: string; roleId?: string; status?: string };
    if (!body.name?.trim() || !body.email?.trim() || !body.roleId) {
      return NextResponse.json({ error: "Name, email, and role are required" }, { status: 400 });
    }
    const role = await db.role.findUnique({ where: { id: body.roleId } });
    if (!role) return NextResponse.json({ error: "Role was not found" }, { status: 404 });
    const user = await db.user.create({
      data: {
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        roleId: body.roleId,
        status: body.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      },
      include: { role: true },
    });
    return NextResponse.json({
      id: `USR-${user.id.replaceAll("-", "").slice(-8).toUpperCase()}`,
      userId: user.id,
      values: [user.name, user.email, user.role.name, user.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), user.status === "ACTIVE" ? "Active" : "Inactive"],
      status: user.status === "ACTIVE" ? "Active" : "Inactive",
      tone: user.status === "ACTIVE" ? "green" : "red",
    }, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error, "User could not be created");
  }
}