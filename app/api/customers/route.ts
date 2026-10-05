import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const customers = await db.customer.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        sales: {
          select: { total: true },
        },
      },
    });

    return NextResponse.json(
      customers.map((c) => {
        const orderCount = c.sales.length;
        const totalSpent = c.sales.reduce((sum, s) => sum + Number(s.total || 0), 0);
        return {
          id: `CST-${c.id.replaceAll("-", "").slice(-8).toUpperCase()}`,
          customerId: c.id,
          name: c.name,
          phone: c.phone ?? "",
          email: c.email ?? "",
          address: c.address ?? "",
          notes: c.notes ?? "",
          values: [
            c.name,
            c.phone || "—",
            c.email || "—",
            c.address || "—",
            `${orderCount} order${orderCount === 1 ? "" : "s"}`,
            `GHS ${totalSpent.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`,
            orderCount > 0 ? "Active" : "New",
          ],
          status: orderCount > 0 ? "Active" : "New",
          tone: orderCount > 0 ? "green" : "blue",
        };
      })
    );
  } catch (error) {
    console.error("GET /api/customers error:", error);
    return NextResponse.json({ error: "Customer data is unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
      notes?: string;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }

    const customer = await db.customer.create({
      data: {
        name: body.name.trim(),
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        address: body.address?.trim() || null,
        notes: body.notes?.trim() || null,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error, "Customer could not be created");
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
      notes?: string;
    };

    if (!body.id || !body.name?.trim()) {
      return NextResponse.json({ error: "Customer ID and name are required" }, { status: 400 });
    }

    const customer = await db.customer.update({
      where: { id: body.id },
      data: {
        name: body.name.trim(),
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        address: body.address?.trim() || null,
        notes: body.notes?.trim() || null,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    return formatErrorResponse(error, "Customer could not be updated");
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    await db.customer.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return formatErrorResponse(error, "Customer could not be deleted");
  }
}
