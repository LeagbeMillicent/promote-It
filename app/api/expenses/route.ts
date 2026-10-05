import { NextResponse } from "next/server";
import { PaymentMethod } from "@prisma/client";
import { db } from "@/lib/db";
import { formatErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { category?: string; amount?: number; paymentMethod?: PaymentMethod; description?: string };
    if (!body.category?.trim() || body.amount === undefined || !body.paymentMethod) {
      return NextResponse.json({ error: "Category, amount, and payment method are required" }, { status: 400 });
    }
    const [location, user] = await Promise.all([
      db.location.findFirst({ orderBy: { createdAt: "asc" } }),
      db.user.findFirst({ orderBy: { createdAt: "asc" } }),
    ]);
    if (!location || !user) return NextResponse.json({ error: "Create a location and user before recording expenses" }, { status: 409 });
    const expense = await db.expense.create({
      data: {
        category: body.category.trim(),
        amount: body.amount,
        paymentMethod: body.paymentMethod,
        description: body.description?.trim() || "",
        createdById: user.id,
      },
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error, "Expense could not be created");
  }
}

export async function GET() {
  try {
    const expenses = await db.expense.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { createdBy: true } });
    return NextResponse.json(expenses.map((expense) => ({
      id: `EXP-${expense.id.replaceAll("-", "").slice(-8).toUpperCase()}`,
      expenseId: expense.id,
      values: [expense.category, expense.description || "-", expense.paymentMethod.replaceAll("_", " "), `GHS ${Number(expense.amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`, expense.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), "Recorded"],
      status: "Recorded",
      tone: "blue",
    })));
  } catch {
    return NextResponse.json({ error: "Expense data is unavailable" }, { status: 503 });
  }
}