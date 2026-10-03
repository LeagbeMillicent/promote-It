import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { user: true } });
    return NextResponse.json(logs.map((log) => ({
      id: `AUD-${log.id.replaceAll("-", "").slice(-8).toUpperCase()}`,
      values: [log.action, log.entityType, log.user.name, log.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " + log.createdAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), "Success"],
      status: "Success",
      tone: "green",
    })));
  } catch {
    return NextResponse.json({ error: "Audit log data is unavailable" }, { status: 503 });
  }
}
