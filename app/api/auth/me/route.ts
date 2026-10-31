import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const currentUserId = cookieStore.get("auth-user-id")?.value;

    let user = null;
    if (currentUserId) {
      try {
        user = await db.user.findUnique({
          where: { id: currentUserId },
          include: { role: true },
        });
      } catch {
        user = null;
      }
    }

    if (!user) {
      // Fallback to primary active user (e.g. Owner)
      user = await db.user.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        include: { role: true },
      });
    }

    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role?.name || "OWNER",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not retrieve user info" },
      { status: 500 }
    );
  }
}
