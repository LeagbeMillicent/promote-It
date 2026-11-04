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
    const user = await db.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await db.$transaction(async (tx) => {
      // Detach sales
      await tx.sale.updateMany({
        where: { cashierId: id },
        data: { cashierId: null as any },
      });

      // Detach purchases
      await tx.purchase.updateMany({
        where: { createdById: id },
        data: { createdById: null as any },
      });

      // Detach inventory movements
      await tx.inventoryMovement.updateMany({
        where: { userId: id },
        data: { userId: null as any },
      });

      // Detach returns
      await tx.return.updateMany({
        where: { processedById: id },
        data: { processedById: null as any },
      });

      // Detach expenses
      await tx.expense.updateMany({
        where: { createdById: id },
        data: { createdById: null as any },
      });

      // Detach audit logs
      await tx.auditLog.updateMany({
        where: { userId: id },
        data: { userId: null as any },
      });

      // Hard delete the user
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return formatErrorResponse(error, "User could not be deleted");
  }
}
