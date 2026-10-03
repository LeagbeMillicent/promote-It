import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json() as { category?: string; amount?: number; paymentMethod?: string; description?: string };
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (body.category !== undefined) data.category = body.category.trim();
    if (body.amount !== undefined) data.amount = body.amount;
    if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod;
    if (body.description !== undefined) data.description = body.description.trim();
    const expense = await db.expense.update({ where: { id }, data });
    return NextResponse.json(expense);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Expense could not be updated" }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.expense.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Expense could not be deleted" }, { status: 400 });
  }
}