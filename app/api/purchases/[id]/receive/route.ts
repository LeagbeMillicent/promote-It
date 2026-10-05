import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { receivePurchase } from "@/lib/services/purchases";
import { formatErrorResponse } from "@/lib/errors";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({})) as { userId?: string };
    const user = body.userId ? await db.user.findUnique({ where: { id: body.userId } }) : await db.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!user) return NextResponse.json({ error: "Receiving user was not found" }, { status: 404 });
    const purchase = await receivePurchase(id, user.id);
    return NextResponse.json(purchase);
  } catch (error) {
    return formatErrorResponse(error, "Purchase could not be received");
  }
}