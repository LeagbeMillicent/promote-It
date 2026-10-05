import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json() as { name?: string; email?: string; status?: "ACTIVE" | "INACTIVE" };
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.email !== undefined) data.email = body.email.trim().toLowerCase();
    if (body.status !== undefined) data.status = body.status;
    const user = await db.user.update({ where: { id }, data, include: { role: true } });
    return NextResponse.json({
      id: `USR-${user.id.replaceAll("-", "").slice(-8).toUpperCase()}`,
      userId: user.id,
      values: [user.name, user.email, user.role.name, user.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), user.status === "ACTIVE" ? "Active" : "Inactive"],
      status: user.status === "ACTIVE" ? "Active" : "Inactive",
      tone: user.status === "ACTIVE" ? "green" : "red",
    });
  } catch (error) {
    return formatErrorResponse(error, "User could not be updated");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.user.update({ where: { id }, data: { status: "INACTIVE" } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "User could not be deactivated" }, { status: 400 });
  }
}