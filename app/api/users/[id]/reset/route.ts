import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { formatErrorResponse } from "@/lib/errors";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      password?: string;
      currentPassword?: string;
      email?: string;
    };

    const newPassword = body.password?.trim();
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Resolve the user
    let user = null;

    if (id === "me") {
      const cookieStore = await cookies();
      const currentUserId = cookieStore.get("auth-user-id")?.value;
      if (currentUserId) {
        user = await db.user.findUnique({ where: { id: currentUserId } });
      }
      if (!user) {
        // Fallback to active owner/user
        user = await db.user.findFirst({
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
        });
      }
    } else if (id.includes("@")) {
      user = await db.user.findUnique({
        where: { email: id.trim().toLowerCase() },
      });
    } else {
      // Try exact UUID
      try {
        user = await db.user.findUnique({ where: { id } });
      } catch {
        user = null;
      }

      // If not found and looks like USR-XXXXXX formatted ID
      if (!user && id.startsWith("USR-")) {
        const suffix = id.replace("USR-", "").toUpperCase();
        const allUsers = await db.user.findMany();
        user = allUsers.find(
          (u) => u.id.replaceAll("-", "").slice(-8).toUpperCase() === suffix
        ) || null;
      }
    }

    // If still not found and email provided in body
    if (!user && body.email) {
      user = await db.user.findUnique({
        where: { email: body.email.trim().toLowerCase() },
      });
    }

    if (!user) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    // Optional verification of current password
    if (body.currentPassword && user.passwordHash) {
      const isMatch = await bcrypt.compare(body.currentPassword, user.passwordHash);
      if (!isMatch) {
        return NextResponse.json(
          { error: "Current password does not match our records" },
          { status: 400 }
        );
      }
    }

    // Hash new password and update
    const hash = await bcrypt.hash(newPassword, 10);
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hash,
        updatedAt: new Date(),
      },
    });

    // Record audit trail if possible
    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: "PASSWORD_RESET",
          entityType: "User",
          entityId: user.id,
          newValues: {
            message: `Password reset successfully for ${user.name} (${user.email})`,
          },
        },
      });
    } catch {
      // non-fatal
    }

    return NextResponse.json({
      ok: true,
      message: `Password has been reset successfully for ${user.name}`,
      userId: user.id,
    });
  } catch (error) {
    return formatErrorResponse(error, "Password could not be reset");
  }
}